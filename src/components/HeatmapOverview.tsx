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

  // Update heatmap when data or filters change
  useEffect(() => {
    if (!mapInstanceRef.current) {
      console.log('⚠️ Map not ready');
      return;
    }

    console.log('🔥 Creating heatmap...');

    // Remove old heat layer
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
    }

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

    console.log('📊 Filtered points:', filteredData.length);

    if (filteredData.length === 0) {
      console.warn('⚠️ No data to display');
      return;
    }

    // Check if heatLayer is available
    if (!(L as any).heatLayer) {
      console.error('❌ leaflet.heat not loaded!');
      return;
    }

    try {
      const heatLayer = (L as any).heatLayer(filteredData, {
        radius: 35,
        blur: 25,
        maxZoom: 10,
        max: 1.0,
        gradient: {
          0.0: '#1a9850',   // Dark green
          0.15: '#66bd63',  // Light green
          0.25: '#a6d96a',  // Yellow-green
          0.35: '#d9ef8b',  // Light yellow
          0.45: '#ffffbf',  // Yellow
          0.55: '#fee08b',  // Light orange
          0.65: '#fdae61',  // Orange
          0.75: '#f46d43',  // Dark orange
          0.85: '#d73027',  // Red
          0.95: '#a50026',  // Dark red
          1.0: '#67001f'    // Very dark red
        }
      });
      
      heatLayer.addTo(mapInstanceRef.current);
      heatLayerRef.current = heatLayer;
      console.log('✅ Heatmap added!');
    } catch (error) {
      console.error('❌ Error creating heatmap:', error);
    }
  }, [disasters, activeFilters]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Legend with filters */}
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
    </div>
  );
};

export default HeatmapOverview;
