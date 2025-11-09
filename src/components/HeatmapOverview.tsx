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

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

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
    if (intensity >= 0.65) return 'high';
    if (intensity >= 0.45) return 'medium';
    return 'low';
  };

  // Very dense grid for smooth coverage
  const generateDenseGrid = (): Location[] => {
    const locations: Location[] = [];
    // 0.25 degree spacing for smooth coverage
    for (let lat = 6; lat <= 38; lat += 0.25) {
      for (let lng = 66; lng <= 99; lng += 0.25) {
        locations.push({ lat, lng });
      }
    }
    return locations;
  };

  // Fetch weather data
  useEffect(() => {
    const loadWeatherData = async () => {
      if (overlayMode === 'disaster') return;
      
      setLoading(true);
      try {
        const locations = generateDenseGrid();
        const data = await fetchWeatherDataForMultipleLocations(locations);
        setWeatherData(data);
      } catch (error) {
        console.error('Error loading weather:', error);
      }
      setLoading(false);
    };

    loadWeatherData();
  }, [overlayMode]);

  // Generate disaster risk data with dense coverage
  const generateDisasterData = (): [number, number, number][] => {
    const data: [number, number, number][] = [];
    
    // Dense grid for full coverage (0.3 degree spacing)
    for (let lat = 6; lat <= 38; lat += 0.3) {
      for (let lng = 66; lng <= 99; lng += 0.3) {
        let intensity = 0.3; // base low risk
        
        // Coastal cyclone belt (East coast)
        if (lng > 79 && lng < 87 && lat > 15 && lat < 24) {
          intensity = 0.85 + Math.random() * 0.15;
        }
        // Coastal areas (West coast)
        else if (lng < 77 && lat > 8 && lat < 22) {
          intensity = 0.7 + Math.random() * 0.15;
        }
        // Flood zones (Bihar, Assam, Bengal)
        else if ((lng > 83 && lng < 92 && lat > 24 && lat < 27) || 
                 (lng > 87 && lng < 96 && lat > 24 && lat < 29)) {
          intensity = 0.75 + Math.random() * 0.2;
        }
        // Earthquake zones (North, Gujarat)
        else if ((lat > 30 && lng > 73 && lng < 80) || 
                 (lat > 22 && lat < 25 && lng > 68 && lng < 74)) {
          intensity = 0.7 + Math.random() * 0.15;
        }
        // Drought zones (Rajasthan, Maharashtra interior)
        else if ((lng > 70 && lng < 78 && lat > 24 && lat < 30) ||
                 (lng > 74 && lng < 80 && lat > 17 && lat < 22)) {
          intensity = 0.65 + Math.random() * 0.15;
        }
        // Central India - medium risk
        else if (lat > 18 && lat < 28 && lng > 74 && lng < 85) {
          intensity = 0.5 + Math.random() * 0.15;
        }
        // Other areas - low to medium
        else {
          intensity = 0.35 + Math.random() * 0.2;
        }
        
        data.push([lat, lng, intensity]);
      }
    }
    
    return data;
  };

  // Update heatmap
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove old layer
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
    }

    let heatData: [number, number, number][] = [];

    if (overlayMode === 'disaster') {
      const allData = generateDisasterData();
      heatData = allData.filter(point => {
        const level = getIntensityRange(point[2]);
        return activeFilters.has(level);
      });
    } else if (overlayMode === 'temperature' && weatherData.size > 0) {
      heatData = Array.from(weatherData.entries()).map(([key, data]) => {
        const [lat, lng] = key.split(',').map(Number);
        // Temperature range: 10°C (0.0) to 45°C (1.0)
        const intensity = Math.max(0.0, Math.min(1.0, (data.temp - 10) / 35));
        return [lat, lng, intensity];
      });
    } else if (overlayMode === 'rainfall' && weatherData.size > 0) {
      heatData = Array.from(weatherData.entries()).map(([key, data]) => {
        const [lat, lng] = key.split(',').map(Number);
        // Rainfall: 0mm (0.0) to 20mm+ (1.0)
        const intensity = Math.max(0.0, Math.min(1.0, data.rainfall / 20));
        return [lat, lng, intensity];
      });
    }

    if (heatData.length === 0) return;
    if (!(L as any).heatLayer) return;

    try {
      let gradient, radius, blur;
      
      if (overlayMode === 'temperature') {
        gradient = {
          0.0: '#6B2C91',  // Purple (cold)
          0.15: '#2E5A9E', // Dark blue
          0.3: '#3FA0D5',  // Light blue
          0.45: '#6EC9B6', // Cyan
          0.6: '#A8D96E',  // Light green
          0.7: '#F9E547',  // Yellow
          0.8: '#F9A947',  // Orange
          0.9: '#F95738',  // Red-orange
          1.0: '#D72C16'   // Dark red (hot)
        };
        radius = 25;
        blur = 20;
      } else if (overlayMode === 'rainfall') {
        gradient = {
          0.0: '#f5f5f5',  // White (no rain)
          0.2: '#d4e4f7',  // Very light blue
          0.35: '#a8cef1', // Light blue
          0.5: '#7db8ea',  // Medium blue
          0.65: '#5195d3', // Blue
          0.8: '#2e6ba6',  // Dark blue
          1.0: '#1a4d7a'   // Very dark blue (heavy rain)
        };
        radius = 25;
        blur = 20;
      } else {
        gradient = {
          0.0: '#00ff00',  // Green (low risk)
          0.35: '#aaff00', // Yellow-green
          0.5: '#ffff00',  // Yellow
          0.65: '#ffaa00', // Orange
          0.75: '#ff5500', // Red-orange
          0.85: '#ff0000', // Red
          1.0: '#cc0000'   // Dark red (high risk)
        };
        radius = 30;
        blur = 25;
      }

      const heatLayer = (L as any).heatLayer(heatData, {
        radius: radius,
        blur: blur,
        max: 1.0,
        minOpacity: 0.7,
        maxZoom: 18,
        gradient: gradient
      });
      
      heatLayer.addTo(mapInstanceRef.current);
      heatLayerRef.current = heatLayer;
    } catch (error) {
      console.error('Heatmap error:', error);
    }
  }, [disasters, activeFilters, overlayMode, weatherData]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Mode Selector */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass backdrop-blur-md rounded-xl shadow-lg border border-border/20 z-[1000]">
        <Tabs value={overlayMode} onValueChange={(value) => setOverlayMode(value as OverlayMode)}>
          <TabsList className="glass bg-background/50">
            <TabsTrigger value="disaster" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Risk</span>
            </TabsTrigger>
            <TabsTrigger value="temperature" className="gap-2">
              <Cloud className="h-4 w-4" />
              <span className="hidden sm:inline">Temp</span>
            </TabsTrigger>
            <TabsTrigger value="rainfall" className="gap-2">
              <Droplets className="h-4 w-4" />
              <span className="hidden sm:inline">Rain</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 glass backdrop-blur-md p-3 rounded-xl border border-border/20 z-[1000]">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}
      
      {/* Risk Legend */}
      {overlayMode === 'disaster' && (
        <div className="absolute bottom-4 right-4 glass p-4 rounded-xl shadow-lg backdrop-blur-md border border-border/20 z-[1000] max-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Risk Level</h3>
            <Badge variant="outline" className="text-xs">{activeFilters.size}/3</Badge>
          </div>
          
          <div className="space-y-2 mb-3">
            <Button
              variant={activeFilters.has('low') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter('low')}
              className={`w-full justify-start gap-2 h-8 ${
                activeFilters.has('low') 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'opacity-50'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-xs">Low</span>
            </Button>
            
            <Button
              variant={activeFilters.has('medium') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter('medium')}
              className={`w-full justify-start gap-2 h-8 ${
                activeFilters.has('medium') 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'opacity-50'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              <span className="text-xs">Medium</span>
            </Button>
            
            <Button
              variant={activeFilters.has('high') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter('high')}
              className={`w-full justify-start gap-2 h-8 ${
                activeFilters.has('high') 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'opacity-50'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs">High</span>
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Cyclones • Floods • Earthquakes • Droughts
          </p>
        </div>
      )}

      {/* Weather Legend */}
      {overlayMode !== 'disaster' && (
        <div className="absolute bottom-4 right-4 glass p-4 rounded-xl shadow-lg backdrop-blur-md border border-border/20 z-[1000] max-w-[200px]">
          <h3 className="text-sm font-semibold mb-2">
            {overlayMode === 'temperature' ? 'Temperature' : 'Rainfall'}
          </h3>
          <div className="space-y-1">
            {overlayMode === 'temperature' ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                  <span className="text-xs">Cold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-xs">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-xs">Hot</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                  <span className="text-xs">Dry</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-400"></div>
                  <span className="text-xs">Light</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-700"></div>
                  <span className="text-xs">Heavy</span>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Live data</p>
        </div>
      )}
    </div>
  );
};

export default HeatmapOverview;
