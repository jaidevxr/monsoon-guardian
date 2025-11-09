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

const HeatmapOverview: React.FC<HeatmapOverviewProps> = ({ disasters }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any>(null);
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

    console.log('✅ Map initialized');

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

  // Generate grid of locations across India for weather data
  const generateIndiaLocationGrid = (): Location[] => {
    const locations: Location[] = [];
    for (let lat = 8; lat <= 35; lat += 2) {
      for (let lng = 68; lng <= 97; lng += 2) {
        locations.push({ lat, lng });
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
      // Comprehensive heat data across India
      const allHeatData: [number, number, number][] = [
      // High risk zones (Red - Intensity 0.8-1.0)
      [28.7041, 77.1025, 0.9],  // Delhi
      [19.0760, 72.8777, 0.95], // Mumbai
      [25.0961, 85.3131, 1.0],  // Bihar
      [20.9517, 85.0985, 0.95], // Odisha coast
      [26.2006, 92.9376, 0.9],  // Assam
      [10.8505, 76.2711, 0.9],  // Kerala
      [27.0238, 74.2179, 0.95], // Rajasthan
      
      // Medium-high risk (Orange - 0.6-0.8)
      [26.8467, 80.9462, 0.75], // Lucknow
      [22.5726, 88.3639, 0.8],  // Kolkata
      [13.0827, 80.2707, 0.75], // Chennai
      [17.3850, 78.4867, 0.7],  // Hyderabad
      [12.9716, 77.5946, 0.7],  // Bangalore
      [23.0225, 72.5714, 0.8],  // Ahmedabad
      [18.5204, 73.8567, 0.75], // Pune
      
      // Medium risk zones (Yellow-Orange - 0.4-0.6)
      [30.7333, 76.7794, 0.6],  // Chandigarh
      [26.9124, 75.7873, 0.65], // Jaipur
      [23.2599, 77.4126, 0.6],  // Bhopal
      [21.1458, 79.0882, 0.55], // Nagpur
      [15.3173, 75.7139, 0.6],  // Karnataka inland
      
      // Additional high-density coverage
      // North India
      [31.1048, 77.1734, 0.7], [32.2432, 77.1892, 0.65], [30.0668, 79.0193, 0.75],
      [29.3803, 79.4636, 0.7], [28.4595, 77.0266, 0.85], [29.0588, 76.0856, 0.7],
      
      // Eastern states
      [25.5940, 85.1376, 0.85], [26.1197, 85.5210, 0.9], [23.6102, 85.2799, 0.65],
      [22.9868, 87.8550, 0.75], [26.7271, 88.3953, 0.7], [24.6340, 87.8492, 0.75],
      
      // Northeast
      [26.1445, 91.7362, 0.85], [27.4728, 94.9120, 0.8], [25.4670, 91.3662, 0.75],
      [24.6637, 93.9063, 0.7], [25.6747, 94.1086, 0.75],
      
      // Western states
      [23.0225, 69.6669, 0.75], [21.1702, 72.8311, 0.85], [22.3072, 73.1812, 0.75],
      [26.4499, 74.6399, 0.8], [25.2138, 75.8648, 0.85], [24.5854, 73.7125, 0.7],
      
      // Central India
      [22.7196, 75.8577, 0.65], [21.2787, 81.8661, 0.7], [23.1765, 79.9369, 0.65],
      
      // Southern states
      [16.5062, 80.6480, 0.75], [14.4426, 79.9865, 0.7], [11.1271, 78.6569, 0.75],
      [10.7905, 78.7047, 0.7], [9.9312, 76.2673, 0.85], [8.5241, 76.9366, 0.8],
      [11.2588, 75.7804, 0.75], [13.3409, 74.7421, 0.75], [15.8497, 74.4977, 0.7],
      
      // Coastal regions (high cyclone risk)
      [19.8135, 85.8312, 0.9], [20.2961, 85.8245, 0.9], [21.9497, 86.1126, 0.8],
      [17.6868, 83.2185, 0.8], [16.9891, 82.2475, 0.75], [11.7480, 92.6586, 0.7],
      [21.6417, 69.6293, 0.75], [15.3173, 73.9572, 0.75],
      
      // Low-medium risk (Green-Yellow - 0.3-0.5)
      [31.6340, 74.8723, 0.5], [30.9010, 75.8573, 0.45], [32.0840, 77.5671, 0.5],
      [27.8974, 78.0880, 0.55], [26.2006, 78.1778, 0.5], [20.7515, 78.7431, 0.55],
      [19.9975, 73.7898, 0.6], [18.5912, 75.7139, 0.55], [12.2958, 76.6394, 0.5],
      [10.5276, 76.2144, 0.6], [9.5916, 76.5222, 0.65], [11.9416, 79.8083, 0.6],
    ];

      console.log('📊 Heat points:', allHeatData.length);

      // Filter data
      const filteredData = allHeatData.filter(point => {
        const level = getIntensityRange(point[2]);
        return activeFilters.has(level);
      });

      heatmapData = filteredData;
    } else if (overlayMode === 'temperature' && weatherData.size > 0) {
      // Temperature overlay
      heatmapData = Array.from(weatherData.entries()).map(([key, data]) => {
        const [lat, lng] = key.split(',').map(Number);
        // Normalize temperature (0-50°C) to intensity (0-1)
        const intensity = Math.max(0, Math.min(1, data.temp / 50));
        return [lat, lng, intensity];
      });
    } else if (overlayMode === 'rainfall' && weatherData.size > 0) {
      // Rainfall overlay
      heatmapData = Array.from(weatherData.entries())
        .filter(([_, data]) => data.rainfall > 0.1)
        .map(([key, data]) => {
          const [lat, lng] = key.split(',').map(Number);
          // Normalize rainfall (0-50mm) to intensity (0-1)
          const intensity = Math.max(0, Math.min(1, data.rainfall / 50));
          return [lat, lng, Math.max(0.3, intensity)]; // Minimum 0.3 for visibility
        });
      
      // Add some visible sample points if no rainfall data
      if (heatmapData.length === 0) {
        heatmapData = [
          [10.8505, 76.2711, 0.8], [9.9312, 76.2673, 0.7], [11.2588, 75.7804, 0.6],
          [26.2006, 92.9376, 0.7], [22.5726, 88.3639, 0.6], [19.0760, 72.8777, 0.75],
        ];
      }
    }

    console.log('📊 Final heat points:', heatmapData.length);

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
      // Choose gradient and settings based on overlay mode
      let gradient, radius, blur;
      
      if (overlayMode === 'temperature') {
        gradient = {
          0.0: '#0000ff',   // Blue - cold
          0.2: '#00d4ff',   // Bright cyan
          0.4: '#00ff00',   // Bright green
          0.6: '#ffff00',   // Bright yellow
          0.8: '#ff6600',   // Bright orange
          1.0: '#ff0000'    // Bright red - hot
        };
        radius = 40;
        blur = 30;
      } else if (overlayMode === 'rainfall') {
        gradient = {
          0.0: '#ffffff',   // White - no rain
          0.2: '#66ccff',   // Light blue
          0.4: '#3399ff',   // Medium blue
          0.6: '#0066ff',   // Bright blue
          0.8: '#0033cc',   // Dark blue
          1.0: '#001a66'    // Very dark blue - heavy rain
        };
        radius = 40;
        blur = 30;
      } else {
        // Disaster risk - much more vibrant colors
        gradient = {
          0.0: '#00ff00',   // Bright green - low risk
          0.2: '#66ff00',   // Yellow-green
          0.3: '#ccff00',   // Lime
          0.4: '#ffff00',   // Bright yellow
          0.5: '#ffcc00',   // Gold
          0.6: '#ff9900',   // Bright orange
          0.7: '#ff6600',   // Dark orange
          0.8: '#ff3300',   // Red-orange
          0.9: '#ff0000',   // Bright red
          1.0: '#cc0000'    // Dark red - high risk
        };
        radius = 35;
        blur = 25;
      }

      const heatLayer = (L as any).heatLayer(heatmapData, {
        radius: radius,
        blur: blur,
        maxZoom: 10,
        max: 1.0,
        minOpacity: 0.6, // Minimum opacity for better visibility
        gradient: gradient
      });
      
      heatLayer.addTo(mapInstanceRef.current);
      heatLayerRef.current = heatLayer;
      console.log('✅ Heatmap added!');
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

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 glass backdrop-blur-md p-3 rounded-xl shadow-lg border border-border/20 z-[1000]">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm text-foreground">Loading weather data...</span>
          </div>
        </div>
      )}
      
      {/* Legend with filters - Only for disaster mode */}
      {overlayMode === 'disaster' && (
      <div className="absolute bottom-4 right-4 glass p-4 rounded-xl shadow-lg backdrop-blur-md border border-border/20 z-[1000]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Risk Filter</h3>
          <Badge variant="outline" className="text-xs">
            {activeFilters.size}/3 Active
          </Badge>
        </div>
        
        <div className="space-y-2">
          <Button
            variant={activeFilters.has('low') ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleFilter('low')}
            className={`w-full justify-start gap-2 transition-all ${
              activeFilters.has('low') 
                ? 'bg-gradient-to-r from-green-600 to-green-400 hover:from-green-700 hover:to-green-500 text-white' 
                : 'opacity-50 hover:opacity-100'
            }`}
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-600 to-green-400"></div>
            <span className="text-xs font-medium">Low Risk</span>
          </Button>
          
          <Button
            variant={activeFilters.has('medium') ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleFilter('medium')}
            className={`w-full justify-start gap-2 transition-all ${
              activeFilters.has('medium') 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-400 hover:from-yellow-600 hover:to-orange-500 text-white' 
                : 'opacity-50 hover:opacity-100'
            }`}
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-500 to-orange-400"></div>
            <span className="text-xs font-medium">Medium Risk</span>
          </Button>
          
          <Button
            variant={activeFilters.has('high') ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleFilter('high')}
            className={`w-full justify-start gap-2 transition-all ${
              activeFilters.has('high') 
                ? 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white' 
                : 'opacity-50 hover:opacity-100'
            }`}
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-600 to-red-800"></div>
            <span className="text-xs font-medium">High Risk</span>
          </Button>
        </div>
        
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/20">
            Click to toggle risk levels
          </p>
        </div>
      )}

      {/* Weather Legend - Show for temperature/rainfall modes */}
      {overlayMode !== 'disaster' && (
        <div className="absolute bottom-4 right-4 glass p-4 rounded-xl shadow-lg backdrop-blur-md border border-border/20 z-[1000]">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {overlayMode === 'temperature' ? 'Temperature Scale' : 'Rainfall Intensity'}
          </h3>
          <div className="space-y-1">
            {overlayMode === 'temperature' ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#0000ff' }}></div>
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
                  <div className="w-4 h-4 rounded-full" style={{ background: '#66ccff' }}></div>
                  <span className="text-xs text-muted-foreground">Light (&lt;5mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#0066ff' }}></div>
                  <span className="text-xs text-muted-foreground">Moderate (10-25mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#001a66' }}></div>
                  <span className="text-xs text-muted-foreground">Heavy (&gt;35mm)</span>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/20">
            Real-time data from Open-Meteo
          </p>
        </div>
      )}
    </div>
  );
};

export default HeatmapOverview;
