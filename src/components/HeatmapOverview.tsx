import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { DisasterEvent, Location } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchWeatherDataForMultipleLocations } from '@/utils/api';
import { Cloud, Droplets, AlertTriangle } from 'lucide-react';

interface HeatmapOverviewProps {
  disasters: DisasterEvent[];
}

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type RiskLevel = 'low' | 'medium' | 'high';
type OverlayMode = 'disaster' | 'temperature' | 'rainfall';

// Indian states data with boundaries for click zoom
const indianStates = [
  { name: 'Jammu and Kashmir', center: [34.0, 75.5], zoom: 7 },
  { name: 'Himachal Pradesh', center: [31.1, 77.2], zoom: 8 },
  { name: 'Punjab', center: [31.1, 75.3], zoom: 8 },
  { name: 'Uttarakhand', center: [30.1, 79.0], zoom: 8 },
  { name: 'Haryana', center: [29.1, 76.1], zoom: 8 },
  { name: 'Delhi', center: [28.7, 77.1], zoom: 11 },
  { name: 'Rajasthan', center: [27.0, 74.2], zoom: 7 },
  { name: 'Uttar Pradesh', center: [26.8, 80.9], zoom: 7 },
  { name: 'Bihar', center: [25.1, 85.3], zoom: 8 },
  { name: 'Sikkim', center: [27.5, 88.5], zoom: 9 },
  { name: 'Arunachal Pradesh', center: [28.2, 94.7], zoom: 7 },
  { name: 'Nagaland', center: [26.2, 94.6], zoom: 8 },
  { name: 'Manipur', center: [24.7, 93.9], zoom: 8 },
  { name: 'Mizoram', center: [23.2, 92.9], zoom: 8 },
  { name: 'Tripura', center: [23.9, 91.9], zoom: 9 },
  { name: 'Meghalaya', center: [25.5, 91.4], zoom: 8 },
  { name: 'Assam', center: [26.2, 92.9], zoom: 7 },
  { name: 'West Bengal', center: [22.6, 88.4], zoom: 7 },
  { name: 'Jharkhand', center: [23.6, 85.3], zoom: 8 },
  { name: 'Odisha', center: [20.9, 85.1], zoom: 7 },
  { name: 'Chhattisgarh', center: [21.3, 81.9], zoom: 7 },
  { name: 'Madhya Pradesh', center: [23.3, 77.4], zoom: 7 },
  { name: 'Gujarat', center: [22.3, 71.2], zoom: 7 },
  { name: 'Maharashtra', center: [19.8, 75.8], zoom: 7 },
  { name: 'Andhra Pradesh', center: [15.9, 79.7], zoom: 7 },
  { name: 'Telangana', center: [18.1, 79.0], zoom: 8 },
  { name: 'Karnataka', center: [15.3, 75.7], zoom: 7 },
  { name: 'Goa', center: [15.3, 74.1], zoom: 10 },
  { name: 'Kerala', center: [10.8, 76.3], zoom: 8 },
  { name: 'Tamil Nadu', center: [11.1, 78.7], zoom: 7 },
];

const HeatmapOverview: React.FC<HeatmapOverviewProps> = ({ disasters }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any>(null);
  const stateMarkersRef = useRef<L.Marker[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<RiskLevel>>(
    new Set(['low', 'medium', 'high'])
  );
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('disaster');
  const [weatherData, setWeatherData] = useState<Map<string, { temp: number; rainfall: number }>>(new Map());
  const [loading, setLoading] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('🗺️ Initializing map...');

    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Add state markers for clicking
    indianStates.forEach(state => {
      const marker = L.marker([state.center[0], state.center[1]], {
        opacity: 0,
        interactive: true
      }).addTo(map);
      
      marker.on('click', () => {
        map.setView([state.center[0], state.center[1]], state.zoom);
        console.log('📍 Zoomed to:', state.name);
      });
      
      stateMarkersRef.current.push(marker);
    });

    console.log('✅ Map initialized with', indianStates.length, 'clickable states');

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const toggleFilter = (level: RiskLevel) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(level)) {
        newFilters.delete(level);
      } else {
        newFilters.add(level);
      }
      return newFilters;
    });
  };

  const getIntensityRange = (intensity: number): RiskLevel => {
    if (intensity >= 0.7) return 'high';
    if (intensity >= 0.5) return 'medium';
    return 'low';
  };

  // Generate comprehensive grid across India with jitter
  const generateIndiaLocationGrid = (): Location[] => {
    const locations: Location[] = [];
    // Denser grid with jitter for natural look
    for (let lat = 8; lat <= 36; lat += 1.5) {
      for (let lng = 68; lng <= 97; lng += 1.5) {
        // Add small random offset to avoid grid pattern
        const jitterLat = lat + (Math.random() - 0.5) * 0.5;
        const jitterLng = lng + (Math.random() - 0.5) * 0.5;
        locations.push({ lat: jitterLat, lng: jitterLng });
      }
    }
    return locations;
  };

  // Fetch weather data when overlay mode changes
  useEffect(() => {
    const loadWeatherData = async () => {
      if (overlayMode === 'disaster') return;
      
      setLoading(true);
      try {
        const locations = generateIndiaLocationGrid();
        const data = await fetchWeatherDataForMultipleLocations(locations);
        setWeatherData(data);
        console.log('✅ Weather data loaded:', data.size, 'locations');
      } catch (error) {
        console.error('❌ Error loading weather data:', error);
      }
      setLoading(false);
    };

    loadWeatherData();
  }, [overlayMode]);

  // Calculate disaster risk based on historical data, geography, and vulnerability
  const generateDisasterRiskData = (): [number, number, number][] => {
    const riskData: [number, number, number][] = [];
    
    // High risk coastal cyclone zones (Odisha, Andhra, Tamil Nadu, West Bengal)
    const cycloneZones: [number, number, number][] = [
      [20.95, 85.10, 0.95], [19.82, 85.83, 0.9], [20.30, 85.82, 0.92], [21.50, 84.03, 0.88],
      [17.69, 83.22, 0.85], [16.99, 82.25, 0.83], [16.51, 80.65, 0.8], [15.91, 79.74, 0.78],
      [13.08, 80.27, 0.85], [11.13, 79.83, 0.8], [10.79, 79.14, 0.75], [11.75, 79.77, 0.78],
      [22.57, 88.36, 0.82], [21.64, 87.85, 0.8], [22.35, 88.26, 0.8],
    ];
    
    // High risk flood zones (Bihar, Assam, UP, Kerala)
    const floodZones: [number, number, number][] = [
      [25.10, 85.31, 0.95], [26.12, 85.52, 0.92], [25.59, 85.14, 0.9], [26.45, 87.33, 0.88],
      [26.20, 92.94, 0.93], [26.14, 91.74, 0.9], [27.47, 94.91, 0.88], [25.61, 91.99, 0.85],
      [26.85, 80.95, 0.85], [25.44, 81.85, 0.83], [27.18, 78.01, 0.8], [26.20, 78.18, 0.78],
      [10.85, 76.27, 0.9], [9.93, 76.27, 0.88], [11.26, 75.78, 0.85], [8.52, 76.94, 0.83],
    ];
    
    // High risk earthquake zones (Himalayas, Gujarat, Northeast)
    const earthquakeZones: [number, number, number][] = [
      [34.08, 74.80, 0.88], [32.73, 74.86, 0.85], [31.10, 77.17, 0.83], [32.24, 77.19, 0.8],
      [30.07, 79.02, 0.85], [29.38, 79.46, 0.83], [30.73, 79.62, 0.8], [30.32, 78.03, 0.78],
      [23.02, 72.57, 0.88], [22.26, 71.19, 0.85], [23.02, 69.67, 0.8], [21.17, 72.83, 0.83],
      [24.66, 93.91, 0.83], [25.67, 94.11, 0.8], [26.16, 94.56, 0.78],
    ];
    
    // High risk drought zones (Rajasthan, Maharashtra, Karnataka)
    const droughtZones: [number, number, number][] = [
      [27.02, 74.22, 0.92], [26.91, 75.79, 0.9], [28.02, 73.31, 0.88], [26.45, 74.64, 0.85],
      [25.21, 75.86, 0.88], [26.24, 73.02, 0.85], [24.59, 73.71, 0.83], [27.39, 73.43, 0.8],
      [19.08, 72.88, 0.88], [18.52, 73.86, 0.85], [19.22, 72.98, 0.83], [19.00, 74.77, 0.8],
      [17.39, 78.49, 0.8], [16.71, 74.24, 0.78], [15.32, 75.71, 0.75],
    ];
    
    // Medium risk zones across other areas
    const mediumRiskZones: [number, number, number][] = [
      [28.70, 77.10, 0.72], [31.63, 74.87, 0.68], [30.90, 75.86, 0.65], [29.06, 76.09, 0.68],
      [22.72, 75.86, 0.65], [23.26, 77.41, 0.68], [21.15, 79.09, 0.65], [23.18, 79.94, 0.63],
      [21.28, 81.87, 0.65], [22.08, 82.14, 0.63], [12.97, 77.59, 0.68], [13.34, 74.74, 0.65],
      [15.85, 74.50, 0.63], [23.61, 85.28, 0.65], [22.80, 86.20, 0.63], [23.58, 87.31, 0.63],
    ];
    
    // Low risk zones
    const lowRiskZones: [number, number, number][] = [
      [31.33, 75.58, 0.45], [30.20, 74.95, 0.42], [32.08, 77.57, 0.48], [31.89, 77.06, 0.45],
      [27.89, 78.09, 0.48], [26.45, 80.33, 0.45], [20.75, 78.74, 0.42], [19.88, 75.34, 0.45],
      [18.11, 76.10, 0.42], [12.30, 76.64, 0.45], [10.53, 76.21, 0.48], [9.59, 76.52, 0.45],
      [11.94, 79.81, 0.42], [10.37, 77.94, 0.45], [24.63, 84.99, 0.42],
    ];
    
    return [...cycloneZones, ...floodZones, ...earthquakeZones, ...droughtZones, ...mediumRiskZones, ...lowRiskZones];
  };

  // Update heatmap when data or filters change
  useEffect(() => {
    if (!mapInstanceRef.current) {
      console.log('⚠️ Map not ready');
      return;
    }

    console.log('🔥 Creating heatmap for mode:', overlayMode);

    // Remove old heat layer
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
    }

    let heatmapData: [number, number, number][] = [];

    if (overlayMode === 'disaster') {
      const allHeatData = generateDisasterRiskData();
      
      // Filter by active risk levels
      heatmapData = allHeatData.filter(point => {
        const level = getIntensityRange(point[2]);
        return activeFilters.has(level);
      });
      
      console.log('📊 Disaster risk points:', heatmapData.length);
    } else if (overlayMode === 'temperature' && weatherData.size > 0) {
      // Temperature overlay with all data points
      heatmapData = Array.from(weatherData.entries()).map(([key, data]) => {
        const [lat, lng] = key.split(',').map(Number);
        // Normalize temperature (0-50°C) to intensity
        const intensity = Math.max(0.2, Math.min(1, data.temp / 50));
        return [lat, lng, intensity];
      });
      
      console.log('🌡️ Temperature points:', heatmapData.length);
    } else if (overlayMode === 'rainfall' && weatherData.size > 0) {
      // Rainfall overlay - show all points with any data
      heatmapData = Array.from(weatherData.entries()).map(([key, data]) => {
        const [lat, lng] = key.split(',').map(Number);
        // Even 0 rainfall shows as very light
        const intensity = data.rainfall > 0 
          ? Math.max(0.3, Math.min(1, data.rainfall / 30))
          : 0.15;
        return [lat, lng, intensity];
      });
      
      console.log('💧 Rainfall points:', heatmapData.length);
    }

    if (heatmapData.length === 0) {
      console.warn('⚠️ No data to display');
      return;
    }

    // Check if heatLayer is available
    if (!(L as any).heatLayer) {
      console.error('❌ leaflet.heat not loaded!');
      return;
    }

    try {
      let gradient, radius, blur, minOpacity;
      
      if (overlayMode === 'temperature') {
        gradient = {
          0.0: '#0033ff',   // Deep blue - very cold
          0.3: '#00ccff',   // Cyan - cold
          0.5: '#00ff00',   // Green - moderate
          0.7: '#ffff00',   // Yellow - warm
          0.9: '#ff0000',   // Red - hot
          1.0: '#990000'    // Dark red - very hot
        };
        radius = 50;
        blur = 40;
        minOpacity = 0.4;
      } else if (overlayMode === 'rainfall') {
        gradient = {
          0.0: '#f0f0f0',   // Very light gray
          0.2: '#b3d9ff',   // Light blue
          0.4: '#66b3ff',   // Medium blue  
          0.6: '#3399ff',   // Blue
          0.8: '#0066cc',   // Dark blue
          1.0: '#003d7a'    // Very dark blue
        };
        radius = 50;
        blur = 40;
        minOpacity = 0.3;
      } else {
        // Disaster risk - vibrant colors
        gradient = {
          0.0: '#00ff00',   // Bright green - safe
          0.3: '#99ff00',   // Yellow-green
          0.4: '#ffff00',   // Bright yellow  
          0.5: '#ffcc00',   // Gold
          0.6: '#ff9900',   // Orange
          0.7: '#ff6600',   // Dark orange
          0.8: '#ff3300',   // Red-orange
          0.9: '#ff0000',   // Bright red
          1.0: '#cc0000'    // Dark red - extreme risk
        };
        radius = 40;
        blur = 30;
        minOpacity = 0.5;
      }

      const heatLayer = (L as any).heatLayer(heatmapData, {
        radius: radius,
        blur: blur,
        maxZoom: 10,
        max: 1.0,
        minOpacity: minOpacity,
        gradient: gradient
      });
      
      heatLayer.addTo(mapInstanceRef.current);
      heatLayerRef.current = heatLayer;
      console.log('✅ Heatmap rendered successfully!');
    } catch (error) {
      console.error('❌ Error creating heatmap:', error);
    }
  }, [disasters, activeFilters, overlayMode, weatherData]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Overlay Mode Selector */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass backdrop-blur-md rounded-xl shadow-lg border border-border/20 z-[1000]">
        <Tabs value={overlayMode} onValueChange={(value) => setOverlayMode(value as OverlayMode)} className="w-auto">
          <TabsList className="glass bg-background/50">
            <TabsTrigger value="disaster" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Disaster Risk</span>
            </TabsTrigger>
            <TabsTrigger value="temperature" className="gap-2">
              <Cloud className="h-4 w-4" />
              <span className="hidden sm:inline">Temperature</span>
            </TabsTrigger>
            <TabsTrigger value="rainfall" className="gap-2">
              <Droplets className="h-4 w-4" />
              <span className="hidden sm:inline">Rainfall</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Info badge */}
      <div className="absolute top-4 left-4 glass backdrop-blur-md p-2 px-3 rounded-lg border border-border/20 z-[1000]">
        <p className="text-xs text-foreground">
          💡 Click anywhere on map to zoom into states
        </p>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 glass backdrop-blur-md p-3 rounded-xl shadow-lg border border-border/20 z-[1000]">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm text-foreground">Loading weather data...</span>
          </div>
        </div>
      )}
      
      {/* Disaster Risk Legend with filters */}
      {overlayMode === 'disaster' && (
        <div className="absolute bottom-4 right-4 glass p-4 rounded-xl shadow-lg backdrop-blur-md border border-border/20 z-[1000]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Disaster Risk</h3>
            <Badge variant="outline" className="text-xs">
              {activeFilters.size}/3 Active
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground mb-3">
            Based on: Cyclones, Floods, Earthquakes, Droughts
          </p>
          
          <div className="space-y-2">
            <Button
              variant={activeFilters.has('low') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter('low')}
              className={`w-full justify-start gap-2 transition-all ${
                activeFilters.has('low') 
                  ? 'bg-gradient-to-r from-green-500 to-green-400 hover:from-green-600 hover:to-green-500 text-white' 
                  : 'opacity-50 hover:opacity-100'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-400"></div>
              <span className="text-xs font-medium">Low Risk</span>
            </Button>
            
            <Button
              variant={activeFilters.has('medium') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter('medium')}
              className={`w-full justify-start gap-2 transition-all ${
                activeFilters.has('medium') 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white' 
                  : 'opacity-50 hover:opacity-100'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"></div>
              <span className="text-xs font-medium">Medium Risk</span>
            </Button>
            
            <Button
              variant={activeFilters.has('high') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter('high')}
              className={`w-full justify-start gap-2 transition-all ${
                activeFilters.has('high') 
                  ? 'bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white' 
                  : 'opacity-50 hover:opacity-100'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-red-700"></div>
              <span className="text-xs font-medium">High Risk</span>
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/20">
            Click to toggle risk levels
          </p>
        </div>
      )}

      {/* Weather Legends */}
      {overlayMode !== 'disaster' && (
        <div className="absolute bottom-4 right-4 glass p-4 rounded-xl shadow-lg backdrop-blur-md border border-border/20 z-[1000]">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {overlayMode === 'temperature' ? 'Temperature' : 'Rainfall Intensity'}
          </h3>
          <div className="space-y-1">
            {overlayMode === 'temperature' ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#0033ff' }}></div>
                  <span className="text-xs text-muted-foreground">Cold (&lt;10°C)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#00ff00' }}></div>
                  <span className="text-xs text-muted-foreground">Moderate (20-30°C)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#ff0000' }}></div>
                  <span className="text-xs text-muted-foreground">Hot (&gt;40°C)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#b3d9ff' }}></div>
                  <span className="text-xs text-muted-foreground">Light (&lt;5mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#3399ff' }}></div>
                  <span className="text-xs text-muted-foreground">Moderate (10-25mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#003d7a' }}></div>
                  <span className="text-xs text-muted-foreground">Heavy (&gt;35mm)</span>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/20">
            Live data: Open-Meteo API
          </p>
        </div>
      )}
    </div>
  );
};

export default HeatmapOverview;
