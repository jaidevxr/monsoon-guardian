import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { DisasterEvent } from '@/types';

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

const HeatmapOverview: React.FC<HeatmapOverviewProps> = ({ disasters }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !disasters.length) return;

    // Remove existing heat layer
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
    }

    // Prepare heat data
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

    // Add sample disaster hotspots across India for demo
    const sampleHotspots = [
      // Punjab (floods)
      [30.7333, 76.7794, 0.8], [31.1471, 75.3412, 0.7], [30.9010, 75.8573, 0.6],
      // Maharashtra (drought/floods)
      [19.0760, 72.8777, 0.9], [18.5204, 73.8567, 0.7], [20.9374, 77.7796, 0.6],
      // Odisha (cyclones)
      [20.9517, 85.0985, 0.9], [19.8135, 85.8312, 0.8],
      // Kerala (floods)
      [10.8505, 76.2711, 0.8], [9.9312, 76.2673, 0.7],
      // Rajasthan (drought)
      [26.9124, 75.7873, 0.6], [27.0238, 74.2179, 0.5],
      // Assam (floods)
      [26.2006, 92.9376, 0.8], [26.1445, 91.7362, 0.7],
      // Gujarat (earthquakes/cyclones)
      [23.0225, 72.5714, 0.7], [21.1702, 72.8311, 0.6],
      // Himachal Pradesh (landslides)
      [31.1048, 77.1734, 0.6], [32.2432, 77.1892, 0.5],
      // West Bengal (cyclones)
      [22.5726, 88.3639, 0.7], [22.9868, 87.8550, 0.6],
      // Tamil Nadu (cyclones/floods)
      [13.0827, 80.2707, 0.8], [11.1271, 78.6569, 0.6],
    ];

    const allHeatData = [...heatData, ...sampleHotspots];

    // Create heat layer
    if ((L as any).heatLayer && allHeatData.length > 0) {
      const heatLayer = (L as any).heatLayer(allHeatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.0: '#313695',
          0.1: '#4575b4', 
          0.2: '#74add1',
          0.3: '#abd9e9',
          0.4: '#e0f3f8',
          0.5: '#ffffcc',
          0.6: '#fee090',
          0.7: '#fdae61',
          0.8: '#f46d43',
          0.9: '#d73027',
          1.0: '#a50026'
        }
      });
      
      heatLayer.addTo(mapInstanceRef.current);
      heatLayerRef.current = heatLayer;
    }
  }, [disasters]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 glass p-4 rounded-xl shadow-lg">
        <h3 className="text-sm font-semibold mb-2 text-foreground">Disaster Risk Intensity</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-400"></div>
            <span className="text-xs text-muted-foreground">Low Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-400"></div>
            <span className="text-xs text-muted-foreground">Medium Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-600 to-red-800"></div>
            <span className="text-xs text-muted-foreground">High Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapOverview;