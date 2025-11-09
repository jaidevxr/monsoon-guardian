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

  // Dense grid across India
  const generateDenseGrid = (): Location[] => {
    const locations: Location[] = [];
    for (let lat = 8; lat <= 36; lat += 1) {
      for (let lng = 68; lng <= 97; lng += 1) {
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

  // Generate disaster risk data covering all of India
  const generateDisasterData = (): [number, number, number][] => {
    const data: [number, number, number][] = [];
    
    // Very high risk zones
    const highRisk: [number, number, number][] = [
      // Coastal cyclone belt
      [20.9, 85.1, 1.0], [19.8, 85.8, 0.95], [20.3, 85.8, 0.95], [17.7, 83.2, 0.9],
      [16.5, 80.6, 0.85], [13.1, 80.3, 0.9], [11.1, 79.8, 0.85], [22.6, 88.4, 0.85],
      // Flood zones  
      [25.1, 85.3, 1.0], [26.2, 92.9, 0.95], [26.1, 91.7, 0.9], [10.9, 76.3, 0.9],
      // Earthquake zones
      [34.1, 74.8, 0.9], [31.1, 77.2, 0.85], [23.0, 72.6, 0.9],
      // Drought zones
      [27.0, 74.2, 0.95], [26.9, 75.8, 0.9], [19.1, 72.9, 0.9],
    ];
    
    // Medium-high risk (spread across India)
    for (let lat = 8; lat <= 36; lat += 2) {
      for (let lng = 68; lng <= 97; lng += 2) {
        // Coastal areas
        if ((lng < 73 && lat < 22) || (lng > 85 && lat < 24)) {
          data.push([lat, lng, 0.7]);
        }
        // North and northeast
        else if (lat > 28 || (lng > 88 && lat > 23)) {
          data.push([lat, lng, 0.75]);
        }
        // Central India
        else if (lat > 18 && lat < 28 && lng > 74 && lng < 85) {
          data.push([lat, lng, 0.6]);
        }
        // Peninsula
        else if (lat < 20) {
          data.push([lat, lng, 0.65]);
        }
        // Rest
        else {
          data.push([lat, lng, 0.55]);
        }
      }
    }
    
    // Low risk zones (fill gaps)
    for (let lat = 9; lat <= 35; lat += 1.5) {
      for (let lng = 69; lng <= 96; lng += 1.5) {
        data.push([lat, lng, 0.4]);
      }
    }
    
    return [...highRisk, ...data];
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
        const intensity = Math.max(0.3, Math.min(1, data.temp / 45));
        return [lat, lng, intensity];
      });
    } else if (overlayMode === 'rainfall' && weatherData.size > 0) {
      heatData = Array.from(weatherData.entries()).map(([key, data]) => {
        const [lat, lng] = key.split(',').map(Number);
        const intensity = data.rainfall > 0 
          ? Math.max(0.4, Math.min(1, data.rainfall / 25))
          : 0.2;
        return [lat, lng, intensity];
      });
    }

    if (heatData.length === 0) return;
    if (!(L as any).heatLayer) return;

    try {
      let gradient, radius, blur;
      
      if (overlayMode === 'temperature') {
        gradient = {
          0.0: '#0044ff',
          0.4: '#00ff00',
          0.6: '#ffff00',
          0.8: '#ff4400',
          1.0: '#ff0000'
        };
        radius = 60;
        blur = 50;
      } else if (overlayMode === 'rainfall') {
        gradient = {
          0.0: '#e0e0e0',
          0.3: '#80b3ff',
          0.5: '#4d94ff',
          0.7: '#1a75ff',
          0.9: '#0052cc',
          1.0: '#003d99'
        };
        radius = 60;
        blur = 50;
      } else {
        gradient = {
          0.0: '#00ff00',
          0.3: '#aaff00',
          0.5: '#ffff00',
          0.6: '#ffaa00',
          0.7: '#ff5500',
          0.85: '#ff0000',
          1.0: '#cc0000'
        };
        radius = 50;
        blur = 40;
      }

      const heatLayer = (L as any).heatLayer(heatData, {
        radius: radius,
        blur: blur,
        max: 1.0,
        minOpacity: 0.6,
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
