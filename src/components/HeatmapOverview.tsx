import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DisasterEvent, Location } from '@/types';
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
  const markersRef = useRef<L.CircleMarker[]>([]);
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

  // Sparse grid for control points
  const generateControlPoints = (): Location[] => {
    const locations: Location[] = [];
    // 2 degree spacing for visible control points
    for (let lat = 8; lat <= 36; lat += 2) {
      for (let lng = 68; lng <= 97; lng += 2) {
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
        const locations = generateControlPoints();
        const data = await fetchWeatherDataForMultipleLocations(locations);
        setWeatherData(data);
      } catch (error) {
        console.error('Error loading weather:', error);
      }
      setLoading(false);
    };

    loadWeatherData();
  }, [overlayMode]);

  // Get color based on value
  const getColor = (value: number, mode: OverlayMode): string => {
    if (mode === 'temperature') {
      // Temperature: 15-40°C
      if (value < 20) return 'rgba(46, 90, 158, 0.3)'; // Cool blue
      if (value < 25) return 'rgba(110, 201, 182, 0.3)'; // Cyan
      if (value < 30) return 'rgba(168, 217, 110, 0.3)'; // Light green
      if (value < 35) return 'rgba(249, 229, 71, 0.3)'; // Yellow
      return 'rgba(249, 87, 56, 0.3)'; // Hot red-orange
    } else if (mode === 'rainfall') {
      // Rainfall: 0-20mm
      if (value < 2) return 'rgba(245, 245, 245, 0.3)'; // Very light
      if (value < 5) return 'rgba(168, 206, 241, 0.3)'; // Light blue
      if (value < 10) return 'rgba(125, 184, 234, 0.3)'; // Medium blue
      if (value < 15) return 'rgba(81, 149, 211, 0.3)'; // Blue
      return 'rgba(46, 107, 166, 0.3)'; // Dark blue
    } else {
      // Disaster risk
      if (value < 0.45) return 'rgba(0, 255, 0, 0.3)'; // Green (low)
      if (value < 0.65) return 'rgba(255, 255, 0, 0.3)'; // Yellow (medium)
      return 'rgba(255, 0, 0, 0.3)'; // Red (high)
    }
  };

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove old markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    if (overlayMode === 'disaster') {
      // Show disaster risk points
      const points = generateControlPoints();
      points.forEach(({ lat, lng }) => {
        // Calculate risk based on location
        let risk = 0.3;
        if ((lng > 79 && lng < 87 && lat > 15 && lat < 24) || // East coast
            (lng < 77 && lat > 8 && lat < 22)) { // West coast
          risk = 0.85;
        } else if ((lng > 83 && lng < 92 && lat > 24 && lat < 27) || // Flood zones
                   (lat > 30 && lng > 73 && lng < 80)) { // Earthquake zones
          risk = 0.75;
        } else if ((lng > 70 && lng < 78 && lat > 24 && lat < 30)) { // Drought
          risk = 0.65;
        } else if (lat > 18 && lat < 28 && lng > 74 && lng < 85) { // Central
          risk = 0.5;
        }

        const level = getIntensityRange(risk);
        if (!activeFilters.has(level)) return;

        const circle = L.circleMarker([lat, lng], {
          radius: 4,
          fillColor: getColor(risk, 'disaster'),
          color: getColor(risk, 'disaster').replace('0.3', '0.6'),
          weight: 1,
          fillOpacity: 0.5,
        });
        
        circle.addTo(mapInstanceRef.current!);
        markersRef.current.push(circle);
      });
    } else if (weatherData.size > 0) {
      // Show weather data points
      weatherData.forEach((data, key) => {
        const [lat, lng] = key.split(',').map(Number);
        const value = overlayMode === 'temperature' ? data.temp : data.rainfall;
        
        const circle = L.circleMarker([lat, lng], {
          radius: 4,
          fillColor: getColor(value, overlayMode),
          color: getColor(value, overlayMode).replace('0.3', '0.6'),
          weight: 1,
          fillOpacity: 0.5,
        }).bindPopup(`
          <div style="font-size: 12px;">
            <strong>${overlayMode === 'temperature' ? 'Temperature' : 'Rainfall'}</strong><br/>
            ${overlayMode === 'temperature' ? `${data.temp.toFixed(1)}°C` : `${data.rainfall.toFixed(1)}mm`}
          </div>
        `);
        
        circle.addTo(mapInstanceRef.current!);
        markersRef.current.push(circle);
      });
    }
  }, [overlayMode, weatherData, activeFilters]);

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
        <div className="absolute bottom-4 right-4 glass p-3 rounded-xl shadow-lg backdrop-blur-md border border-border/20 z-[1000] max-w-[180px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">Risk Level</h3>
            <Badge variant="outline" className="text-xs">{activeFilters.size}/3</Badge>
          </div>
          
          <div className="space-y-1.5">
            <div
              onClick={() => toggleFilter('low')}
              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all ${
                activeFilters.has('low') 
                  ? 'bg-green-500/20' 
                  : 'opacity-40 hover:opacity-60'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-green-400/50 border border-green-600"></div>
              <span className="text-xs">Low</span>
            </div>
            
            <div
              onClick={() => toggleFilter('medium')}
              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all ${
                activeFilters.has('medium') 
                  ? 'bg-yellow-500/20' 
                  : 'opacity-40 hover:opacity-60'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-yellow-400/50 border border-yellow-600"></div>
              <span className="text-xs">Medium</span>
            </div>
            
            <div
              onClick={() => toggleFilter('high')}
              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all ${
                activeFilters.has('high') 
                  ? 'bg-red-500/20' 
                  : 'opacity-40 hover:opacity-60'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-red-500/50 border border-red-600"></div>
              <span className="text-xs">High</span>
            </div>
          </div>
        </div>
      )}

      {/* Weather Legend */}
      {overlayMode !== 'disaster' && (
        <div className="absolute bottom-4 right-4 glass p-3 rounded-xl shadow-lg backdrop-blur-md border border-border/20 z-[1000] max-w-[180px]">
          <h3 className="text-xs font-semibold mb-2">
            {overlayMode === 'temperature' ? 'Temperature' : 'Rainfall'}
          </h3>
          <div className="space-y-1">
            {overlayMode === 'temperature' ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600/50 border border-blue-700"></div>
                  <span className="text-xs">Cool (&lt;20°C)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500/50 border border-green-700"></div>
                  <span className="text-xs">Warm (25-30°C)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50 border border-red-700"></div>
                  <span className="text-xs">Hot (&gt;35°C)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300/50 border border-gray-500"></div>
                  <span className="text-xs">Dry (&lt;2mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400/50 border border-blue-600"></div>
                  <span className="text-xs">Light (5-10mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-700/50 border border-blue-900"></div>
                  <span className="text-xs">Heavy (&gt;15mm)</span>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Click circles for details</p>
        </div>
      )}
    </div>
  );
};

export default HeatmapOverview;
