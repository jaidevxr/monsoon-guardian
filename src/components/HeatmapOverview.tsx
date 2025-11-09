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
type OverlayMode = 'disaster' | 'temperature' | 'rainfall' | 'pollution';

const HeatmapOverview: React.FC<HeatmapOverviewProps> = ({ disasters }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<RiskLevel>>(
    new Set(['low', 'medium', 'high'])
  );
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('disaster');
  const [weatherData, setWeatherData] = useState<Map<string, { temp: number; rainfall: number }>>(new Map());
  const [pollutionData, setPollutionData] = useState<Map<string, number>>(new Map());
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

  // Major Indian cities for weather data
  const getIndianCities = (): Location[] => {
    return [
      // North
      { lat: 28.7041, lng: 77.1025 }, // Delhi
      { lat: 26.9124, lng: 75.7873 }, // Jaipur
      { lat: 30.7333, lng: 76.7794 }, // Chandigarh
      { lat: 31.1048, lng: 77.1734 }, // Shimla
      { lat: 32.7266, lng: 74.8570 }, // Jammu
      { lat: 27.1767, lng: 78.0081 }, // Agra
      { lat: 25.3176, lng: 82.9739 }, // Varanasi
      { lat: 26.8467, lng: 80.9462 }, // Lucknow
      { lat: 28.3949, lng: 79.4222 }, // Bareilly
      { lat: 29.3803, lng: 79.4636 }, // Haldwani
      // Northeast
      { lat: 26.1445, lng: 91.7362 }, // Guwahati
      { lat: 27.4728, lng: 94.9120 }, // Dibrugarh
      { lat: 25.5788, lng: 91.8933 }, // Shillong
      { lat: 23.8315, lng: 91.2868 }, // Agartala
      { lat: 24.6158, lng: 93.9368 }, // Imphal
      // East
      { lat: 22.5726, lng: 88.3639 }, // Kolkata
      { lat: 23.3441, lng: 85.3096 }, // Ranchi
      { lat: 25.5941, lng: 85.1376 }, // Patna
      { lat: 26.4499, lng: 87.2677 }, // Muzaffarpur
      { lat: 20.2961, lng: 85.8245 }, // Bhubaneswar
      { lat: 19.8135, lng: 85.8312 }, // Puri
      // West
      { lat: 19.0760, lng: 72.8777 }, // Mumbai
      { lat: 18.5204, lng: 73.8567 }, // Pune
      { lat: 21.1702, lng: 72.8311 }, // Surat
      { lat: 23.0225, lng: 72.5714 }, // Ahmedabad
      { lat: 22.3072, lng: 73.1812 }, // Vadodara
      { lat: 15.2993, lng: 74.1240 }, // Goa
      // South
      { lat: 12.9716, lng: 77.5946 }, // Bangalore
      { lat: 13.0827, lng: 80.2707 }, // Chennai
      { lat: 17.3850, lng: 78.4867 }, // Hyderabad
      { lat: 8.5241, lng: 76.9366 }, // Trivandrum
      { lat: 9.9312, lng: 76.2673 }, // Kochi
      { lat: 11.0168, lng: 76.9558 }, // Coimbatore
      { lat: 12.2958, lng: 76.6394 }, // Mysore
      { lat: 15.3173, lng: 75.7139 }, // Hubli
      { lat: 16.5062, lng: 80.6480 }, // Vijayawada
      { lat: 14.6819, lng: 77.6003 }, // Anantapur
      // Central
      { lat: 23.2599, lng: 77.4126 }, // Bhopal
      { lat: 22.7196, lng: 75.8577 }, // Indore
      { lat: 21.1458, lng: 79.0882 }, // Nagpur
      { lat: 26.2389, lng: 73.0243 }, // Jodhpur
      { lat: 24.5854, lng: 73.7125 }, // Udaipur
      { lat: 19.9975, lng: 73.7898 }, // Nashik
      // Additional coverage
      { lat: 27.5706, lng: 95.3240 }, // Lakhimpur
      { lat: 24.7914, lng: 93.9381 }, // Imphal
      { lat: 10.8505, lng: 76.2711 }, // Palakkad
      { lat: 9.5916, lng: 76.5222 }, // Alappuzha
      { lat: 11.9416, lng: 79.8083 }, // Pondicherry
      { lat: 13.6288, lng: 79.4192 }, // Tirupati
      { lat: 18.1124, lng: 79.0193 }, // Warangal
      { lat: 22.5645, lng: 88.3968 }, // South Kolkata
    ];
  };

  // Fetch weather data for cities
  useEffect(() => {
    const loadWeatherData = async () => {
      if (overlayMode === 'disaster') return;
      
      setLoading(true);
      try {
        const cities = getIndianCities();
        const data = await fetchWeatherDataForMultipleLocations(cities);
        setWeatherData(data);
      } catch (error) {
        console.error('Error loading weather:', error);
      }
      setLoading(false);
    };

    loadWeatherData();
  }, [overlayMode]);

  // Get color based on value with better opacity for heatmap effect
  const getColor = (value: number, mode: OverlayMode, opacity: number = 0.6): string => {
    if (mode === 'temperature') {
      // Temperature: 15-40°C
      if (value < 20) return `rgba(46, 90, 158, ${opacity})`; // Cool blue
      if (value < 25) return `rgba(110, 201, 182, ${opacity})`; // Cyan
      if (value < 30) return `rgba(168, 217, 110, ${opacity})`; // Light green
      if (value < 35) return `rgba(249, 229, 71, ${opacity})`; // Yellow
      return `rgba(249, 87, 56, ${opacity})`; // Hot red-orange
    } else if (mode === 'rainfall') {
      // Rainfall: 0-20mm
      if (value < 2) return `rgba(245, 245, 245, ${opacity})`; // Very light
      if (value < 5) return `rgba(168, 206, 241, ${opacity})`; // Light blue
      if (value < 10) return `rgba(125, 184, 234, ${opacity})`; // Medium blue
      if (value < 15) return `rgba(81, 149, 211, ${opacity})`; // Blue
      return `rgba(46, 107, 166, ${opacity})`; // Dark blue
    } else if (mode === 'pollution') {
      // AQI: 0-300+
      if (value < 50) return `rgba(0, 228, 0, ${opacity})`; // Good - green
      if (value < 100) return `rgba(255, 255, 0, ${opacity})`; // Moderate - yellow
      if (value < 150) return `rgba(255, 126, 0, ${opacity})`; // Unhealthy for sensitive - orange
      if (value < 200) return `rgba(255, 0, 0, ${opacity})`; // Unhealthy - red
      if (value < 300) return `rgba(153, 0, 76, ${opacity})`; // Very unhealthy - purple
      return `rgba(126, 0, 35, ${opacity})`; // Hazardous - maroon
    } else {
      // Disaster risk
      if (value < 0.45) return `rgba(0, 255, 0, ${opacity})`; // Green (low)
      if (value < 0.65) return `rgba(255, 255, 0, ${opacity})`; // Yellow (medium)
      return `rgba(255, 0, 0, ${opacity})`; // Red (high)
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
      // Show disaster risk for Indian cities
      const cities = getIndianCities();
      cities.forEach(({ lat, lng }) => {
        // Calculate risk based on location
        let risk = 0.3;
        if ((lng > 79 && lng < 87 && lat > 15 && lat < 24) || // East coast cyclone
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

        // Large glow circle for heatmap effect
        const glowCircle = L.circleMarker([lat, lng], {
          radius: 60,
          fillColor: getColor(risk, 'disaster', 0.25),
          color: 'transparent',
          weight: 0,
          fillOpacity: 1,
          className: 'heatmap-glow'
        });
        
        // Small center point
        const centerCircle = L.circleMarker([lat, lng], {
          radius: 2.5,
          fillColor: getColor(risk, 'disaster', 0.7),
          color: getColor(risk, 'disaster', 0.9),
          weight: 1,
          fillOpacity: 0.8,
        });
        
        glowCircle.addTo(mapInstanceRef.current!);
        centerCircle.addTo(mapInstanceRef.current!);
        markersRef.current.push(glowCircle, centerCircle);
      });
    } else if (weatherData.size > 0) {
      // Show weather data with heatmap glow effect
      weatherData.forEach((data, key) => {
        const [lat, lng] = key.split(',').map(Number);
        const value = overlayMode === 'temperature' ? data.temp : data.rainfall;
        
        // Large glow circle for heatmap effect
        const glowCircle = L.circleMarker([lat, lng], {
          radius: 60,
          fillColor: getColor(value, overlayMode, 0.25),
          color: 'transparent',
          weight: 0,
          fillOpacity: 1,
          className: 'heatmap-glow'
        });
        
        // Small center point with popup
        const centerCircle = L.circleMarker([lat, lng], {
          radius: 2.5,
          fillColor: getColor(value, overlayMode, 0.7),
          color: getColor(value, overlayMode, 0.9),
          weight: 1,
          fillOpacity: 0.8,
        }).bindPopup(`
          <div style="font-size: 12px;">
            <strong>${overlayMode === 'temperature' ? 'Temperature' : overlayMode === 'pollution' ? 'Air Quality' : 'Rainfall'}</strong><br/>
            ${overlayMode === 'temperature' ? `${data.temp.toFixed(1)}°C` : overlayMode === 'pollution' ? `AQI: ${value.toFixed(0)}` : `${data.rainfall.toFixed(1)}mm`}
          </div>
        `);
        
        glowCircle.addTo(mapInstanceRef.current!);
        centerCircle.addTo(mapInstanceRef.current!);
        markersRef.current.push(glowCircle, centerCircle);
      });
    }
  }, [overlayMode, weatherData, activeFilters]);

  return (
    <div className="h-full w-full relative">
      <style>{`
        .heatmap-glow {
          filter: blur(35px);
          opacity: 0.7;
        }
      `}</style>
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
            <TabsTrigger value="pollution" className="gap-2">
              <Cloud className="h-4 w-4" />
              <span className="hidden sm:inline">AQI</span>
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
