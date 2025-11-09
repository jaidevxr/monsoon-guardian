import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { DisasterEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

const HeatmapOverview: React.FC<HeatmapOverviewProps> = ({ disasters }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any>(null);
  const [activeFilters, setActiveFilters] = useState<Set<RiskLevel>>(
    new Set(['low', 'medium', 'high'])
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('🗺️ Initializing heatmap...');

    // Initialize map
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    console.log('✅ Map initialized with tile layer');

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

  useEffect(() => {
    if (!mapInstanceRef.current) {
      console.log('⚠️ Map instance not ready yet');
      return;
    }

    console.log('🔥 Preparing heatmap data...', { 
      disastersCount: disasters.length,
      hasHeatLayer: !!(L as any).heatLayer,
      activeFilters: Array.from(activeFilters)
    });

    // Remove existing heat layer
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
      console.log('🗑️ Removed old heat layer');
    }

    // Prepare heat data from disasters
    const heatData = disasters.map(disaster => {
      let intensity = 0.5; // Default intensity
      
      if (disaster.severity === 'high') intensity = 1.0;
      else if (disaster.severity === 'medium') intensity = 0.7;
      else if (disaster.severity === 'low') intensity = 0.4;

      // If earthquake, use magnitude for intensity
      if (disaster.magnitude) {
        intensity = Math.min(disaster.magnitude / 10, 1.0);
      }

      return [disaster.location.lat, disaster.location.lng, intensity];
    });

    // Add comprehensive disaster hotspots across India for realistic coverage
    const sampleHotspots = [
      // Kashmir & J&K (earthquakes, landslides)
      [34.0837, 74.7973, 0.75], [33.7782, 76.5762, 0.7], [32.7266, 74.8570, 0.65],
      
      // Himachal Pradesh (landslides, floods)
      [31.1048, 77.1734, 0.7], [32.2432, 77.1892, 0.65], [31.6840, 76.5048, 0.6],
      [31.8955, 77.0635, 0.55], [32.0840, 77.5671, 0.6],
      
      // Uttarakhand (landslides, cloud bursts)
      [30.0668, 79.0193, 0.8], [29.3803, 79.4636, 0.75], [30.7268, 79.6152, 0.7],
      [29.9457, 78.1642, 0.65], [30.3165, 78.0322, 0.7],
      
      // Punjab (floods)
      [30.7333, 76.7794, 0.6], [31.1471, 75.3412, 0.65], [30.9010, 75.8573, 0.6],
      [31.3260, 75.5762, 0.55], [30.2010, 74.9455, 0.6], [31.6340, 74.8723, 0.65],
      
      // Haryana (floods, heatwaves)
      [29.0588, 76.0856, 0.7], [28.4595, 77.0266, 0.75], [30.3398, 76.3869, 0.65],
      
      // Delhi NCR (heatwaves, floods)
      [28.7041, 77.1025, 0.8], [28.5355, 77.3910, 0.75], [28.4595, 77.0266, 0.7],
      
      // Uttar Pradesh (floods, heatwaves)
      [26.8467, 80.9462, 0.75], [25.4358, 81.8463, 0.8], [27.1767, 78.0081, 0.85],
      [26.4499, 80.3319, 0.7], [25.3176, 82.9739, 0.75], [29.3803, 79.4636, 0.65],
      [27.8974, 78.0880, 0.7], [26.2006, 78.1778, 0.65], [25.5940, 85.1376, 0.7],
      
      // Bihar (floods)
      [25.0961, 85.3131, 0.9], [26.1197, 85.5210, 0.85], [25.5940, 85.1376, 0.8],
      [26.4499, 87.3319, 0.85], [25.2138, 86.9842, 0.8], [25.3811, 84.9869, 0.75],
      
      // Jharkhand (droughts, heatwaves)
      [23.6102, 85.2799, 0.7], [23.3441, 85.3096, 0.75], [22.8046, 86.2029, 0.7],
      [24.6340, 84.9869, 0.65],
      
      // West Bengal (cyclones, floods)
      [22.5726, 88.3639, 0.85], [22.9868, 87.8550, 0.8], [23.5809, 87.3119, 0.75],
      [26.7271, 88.3953, 0.7], [24.6340, 87.8492, 0.75], [22.3476, 87.3119, 0.8],
      
      // Assam (floods, earthquakes)
      [26.2006, 92.9376, 0.9], [26.1445, 91.7362, 0.85], [27.4728, 94.9120, 0.8],
      [25.6093, 91.9882, 0.75], [26.1584, 91.7696, 0.85], [24.8333, 92.7789, 0.8],
      
      // Meghalaya (landslides, floods)
      [25.4670, 91.3662, 0.75], [25.5788, 91.8933, 0.7],
      
      // Manipur & Nagaland (earthquakes, landslides)
      [24.6637, 93.9063, 0.7], [25.6747, 94.1086, 0.75], [26.1584, 94.5624, 0.7],
      
      // Rajasthan (droughts, heatwaves)
      [26.9124, 75.7873, 0.85], [27.0238, 74.2179, 0.9], [28.0229, 73.3119, 0.85],
      [26.4499, 74.6399, 0.8], [25.2138, 75.8648, 0.85], [27.3913, 73.4324, 0.8],
      [24.5854, 73.7125, 0.75], [26.2389, 73.0243, 0.8], [27.8974, 75.8077, 0.75],
      
      // Gujarat (earthquakes, cyclones, floods)
      [23.0225, 72.5714, 0.85], [21.1702, 72.8311, 0.9], [22.3072, 73.1812, 0.8],
      [22.2587, 71.1924, 0.85], [23.0225, 69.6669, 0.75], [20.5937, 70.7512, 0.8],
      [21.7645, 72.1519, 0.7], [22.4707, 70.0577, 0.75],
      
      // Maharashtra (floods, droughts, landslides)
      [19.0760, 72.8777, 0.9], [18.5204, 73.8567, 0.85], [20.9374, 77.7796, 0.7],
      [19.9975, 73.7898, 0.75], [18.5912, 75.7139, 0.7], [21.1458, 79.0882, 0.75],
      [16.7050, 74.2433, 0.7], [19.2183, 72.9781, 0.8], [18.1096, 76.1042, 0.65],
      [20.7515, 78.7431, 0.7], [19.8762, 75.3433, 0.75],
      
      // Madhya Pradesh (droughts, floods)
      [23.2599, 77.4126, 0.75], [22.7196, 75.8577, 0.7], [26.2183, 78.1828, 0.8],
      [24.5854, 73.7125, 0.75], [21.2787, 81.8661, 0.7], [23.1765, 79.9369, 0.7],
      
      // Chhattisgarh (droughts, floods)
      [21.2787, 81.8661, 0.75], [22.0797, 82.1409, 0.7], [20.2514, 81.6296, 0.7],
      
      // Odisha (cyclones, floods)
      [20.9517, 85.0985, 0.95], [19.8135, 85.8312, 0.9], [21.5041, 84.0339, 0.85],
      [20.2961, 85.8245, 0.9], [19.3120, 84.7941, 0.85], [20.4625, 85.8830, 0.9],
      [21.9497, 86.1126, 0.8], [22.5645, 86.0769, 0.8],
      
      // Andhra Pradesh (cyclones, floods, heatwaves)
      [16.5062, 80.6480, 0.8], [17.6868, 83.2185, 0.85], [14.4426, 79.9865, 0.75],
      [15.9129, 79.7400, 0.7], [17.3850, 78.4867, 0.75], [16.9891, 82.2475, 0.8],
      
      // Telangana (floods, droughts)
      [17.3850, 78.4867, 0.75], [18.1124, 79.0193, 0.7], [17.9689, 79.5941, 0.7],
      
      // Karnataka (floods, droughts, landslides)
      [15.3173, 75.7139, 0.75], [12.9716, 77.5946, 0.7], [13.3409, 74.7421, 0.8],
      [14.4426, 75.9234, 0.7], [15.8497, 74.4977, 0.75], [12.2958, 76.6394, 0.7],
      
      // Kerala (floods, landslides)
      [10.8505, 76.2711, 0.9], [9.9312, 76.2673, 0.85], [11.2588, 75.7804, 0.8],
      [8.5241, 76.9366, 0.85], [11.8745, 75.3704, 0.75], [10.5276, 76.2144, 0.8],
      [9.5916, 76.5222, 0.8], [8.8932, 76.6141, 0.75],
      
      // Tamil Nadu (cyclones, floods, droughts)
      [13.0827, 80.2707, 0.85], [11.1271, 78.6569, 0.8], [10.7905, 78.7047, 0.75],
      [12.9165, 79.1325, 0.8], [11.6643, 78.1460, 0.75], [9.9252, 78.1198, 0.7],
      [10.3673, 77.9412, 0.75], [11.9416, 79.8083, 0.8], [8.7642, 78.1348, 0.7],
      
      // Coastal areas (cyclone prone)
      [15.3173, 73.9572, 0.8], [17.8495, 83.3528, 0.85], [11.7480, 92.6586, 0.75],
      [21.6417, 69.6293, 0.8], [19.0728, 72.8826, 0.85],
    ];

    const allHeatData = [...heatData, ...sampleHotspots];

    // Filter heat data based on active filters
    const filteredHeatData = allHeatData.filter(point => {
      const intensity = point[2] as number;
      const level = getIntensityRange(intensity);
      return activeFilters.has(level);
    });

    console.log('📊 Total heat points:', allHeatData.length, 'Filtered:', filteredHeatData.length);

    // Create heat layer
    if ((L as any).heatLayer) {
      if (filteredHeatData.length === 0) {
        console.warn('⚠️ No heat data to display after filtering');
        return;
      }

      try {
        const heatLayer = (L as any).heatLayer(filteredHeatData, {
          radius: 35,
          blur: 25,
          maxZoom: 10,
          max: 1.0,
          gradient: {
            0.0: '#1a9850',   // Dark green - low risk
            0.15: '#66bd63',  // Light green
            0.25: '#a6d96a',  // Yellow-green
            0.35: '#d9ef8b',  // Light yellow
            0.45: '#ffffbf',  // Yellow
            0.55: '#fee08b',  // Light orange
            0.65: '#fdae61',  // Orange
            0.75: '#f46d43',  // Dark orange
            0.85: '#d73027',  // Red
            0.95: '#a50026',  // Dark red - high risk
            1.0: '#67001f'    // Very dark red
          }
        });
        
        heatLayer.addTo(mapInstanceRef.current);
        heatLayerRef.current = heatLayer;
        console.log('✅ Heatmap layer added successfully!');
      } catch (error) {
        console.error('❌ Error creating heat layer:', error);
      }
    } else {
      console.error('❌ leaflet.heat library not loaded! Check if "leaflet.heat" is imported correctly.');
    }
  }, [disasters, activeFilters]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Interactive Legend */}
      <div className="absolute bottom-4 right-4 glass p-4 rounded-xl shadow-lg backdrop-blur-md border border-border/20">
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
    </div>
  );
};

export default HeatmapOverview;