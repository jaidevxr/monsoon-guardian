import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmergencyFacility, Location } from '@/types';
import { fetchEmergencyFacilities, getCurrentLocation } from '@/utils/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Hospital, Shield, AlertTriangle, Phone, RefreshCw } from 'lucide-react';

interface EmergencyServicesMapProps {
  onFacilityClick?: (facility: EmergencyFacility) => void;
}

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const EmergencyServicesMap: React.FC<EmergencyServicesMapProps> = ({ onFacilityClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [facilities, setFacilities] = useState<EmergencyFacility[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 6);
    mapInstanceRef.current = map;

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

  // Get user location and load facilities
  useEffect(() => {
    const loadUserLocationAndFacilities = async () => {
      setLoading(true);
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([location.lat, location.lng], 12);
        }
        
        await loadFacilities(location);
      } catch (error) {
        console.error('Error loading user location:', error);
        // Load facilities around Delhi as fallback
        const defaultLocation = { lat: 28.6139, lng: 77.2090 };
        await loadFacilities(defaultLocation);
      }
      setLoading(false);
    };

    loadUserLocationAndFacilities();
  }, []);

  const loadFacilities = async (location: Location) => {
    try {
      const data = await fetchEmergencyFacilities(location, 20000); // 20km radius
      setFacilities(data);
    } catch (error) {
      console.error('Error loading facilities:', error);
    }
  };

  // Update markers when facilities change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Add user location marker if available
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="
            width: 20px; 
            height: 20px; 
            background: #3b82f6; 
            border: 3px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: pulse 2s infinite;
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindPopup('Your Current Location')
        .addTo(mapInstanceRef.current);
      
      markersRef.current.push(userMarker);
    }

    // Filter facilities by selected type
    const filteredFacilities = selectedType 
      ? facilities.filter(f => f.type === selectedType)
      : facilities;

    // Add facility markers
    filteredFacilities.forEach(facility => {
      const icon = getFacilityIcon(facility.type);
      const color = getFacilityColor(facility.type);
      
      const facilityIcon = L.divIcon({
        className: 'facility-marker',
        html: `
          <div style="
            width: 32px; 
            height: 32px; 
            background: ${color}; 
            border: 2px solid white; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 16px;
          ">${icon}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([facility.location.lat, facility.location.lng], { 
        icon: facilityIcon 
      })
        .bindPopup(`
          <div class="facility-popup">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${facility.name}</h3>
            <p style="margin: 2px 0; font-size: 12px; color: #666;">
              <strong>Type:</strong> ${facility.type.replace('_', ' ')}
            </p>
            ${facility.distance ? `
              <p style="margin: 2px 0; font-size: 12px; color: #666;">
                <strong>Distance:</strong> ${facility.distance}km away
              </p>
            ` : ''}
            ${facility.contact ? `
              <p style="margin: 2px 0; font-size: 12px; color: #666;">
                <strong>Contact:</strong> ${facility.contact}
              </p>
            ` : ''}
          </div>
        `)
        .on('click', () => {
          onFacilityClick?.(facility);
        })
        .addTo(mapInstanceRef.current!);
      
      markersRef.current.push(marker);
    });
  }, [facilities, userLocation, selectedType, onFacilityClick]);

  const getFacilityIcon = (type: string): string => {
    switch (type) {
      case 'hospital': return '🏥';
      case 'police': return '👮';
      case 'fire_station': return '🚒';
      default: return '📍';
    }
  };

  const getFacilityColor = (type: string): string => {
    switch (type) {
      case 'hospital': return '#10b981'; // green
      case 'police': return '#3b82f6'; // blue  
      case 'fire_station': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const facilityCounts = {
    hospital: facilities.filter(f => f.type === 'hospital').length,
    police: facilities.filter(f => f.type === 'police').length,
    fire_station: facilities.filter(f => f.type === 'fire_station').length,
  };

  const handleRefresh = async () => {
    if (userLocation) {
      setLoading(true);
      await loadFacilities(userLocation);
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="h-full w-full" />
        
        {/* Controls */}
        <div className="absolute top-4 left-4 space-y-2">
          <Card className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Filter Services</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            <div className="space-y-2">
              <Button
                variant={selectedType === null ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => setSelectedType(null)}
              >
                <MapPin className="h-3 w-3 mr-2" />
                All ({facilities.length})
              </Button>
              
              <Button
                variant={selectedType === 'hospital' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => setSelectedType('hospital')}
              >
                <Hospital className="h-3 w-3 mr-2" />
                Hospitals ({facilityCounts.hospital})
              </Button>
              
              <Button
                variant={selectedType === 'police' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => setSelectedType('police')}
              >
                <Shield className="h-3 w-3 mr-2" />
                Police ({facilityCounts.police})
              </Button>
              
              <Button
                variant={selectedType === 'fire_station' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => setSelectedType('fire_station')}
              >
                <AlertTriangle className="h-3 w-3 mr-2" />
                Fire Stations ({facilityCounts.fire_station})
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Sidebar with facility list */}
      <div className="w-80 glass-strong border-l border-border/20 p-4 overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-2">Emergency Services</h2>
          <p className="text-sm text-muted-foreground">
            Click on markers or list items for details
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass h-20 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(selectedType ? facilities.filter(f => f.type === selectedType) : facilities)
              .map((facility) => (
                <Card
                  key={facility.id}
                  className="p-3 cursor-pointer hover:shadow-lg transition-smooth glass border-border/10"
                  onClick={() => onFacilityClick?.(facility)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {getFacilityIcon(facility.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {facility.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {facility.type.replace('_', ' ')}
                        </Badge>
                        {facility.distance && (
                          <span className="text-xs text-muted-foreground">
                            {facility.distance}km away
                          </span>
                        )}
                      </div>
                      {facility.contact && (
                        <div className="flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {facility.contact}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            
            {facilities.length === 0 && (
              <div className="text-center py-8">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No emergency facilities found nearby
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyServicesMap;