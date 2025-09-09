import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DisasterEvent, EmergencyFacility, Location, HeatmapPoint } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, Clock } from 'lucide-react';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DisasterMapProps {
  disasters: DisasterEvent[];
  facilities: EmergencyFacility[];
  userLocation: Location | null;
  center: Location;
  onDisasterClick: (disaster: DisasterEvent) => void;
  onFacilityClick: (facility: EmergencyFacility) => void;
}

// Component to update map center
const MapUpdater: React.FC<{ center: Location; zoom?: number }> = ({ center, zoom = 10 }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);

  return null;
};

const DisasterMap: React.FC<DisasterMapProps> = ({
  disasters,
  facilities,
  userLocation,
  center,
  onDisasterClick,
  onFacilityClick,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  // Custom icons for different disaster types
  const getDisasterIcon = (disaster: DisasterEvent) => {
    const iconConfig = {
      earthquake: { emoji: '⚡', color: '#f59e0b' },
      flood: { emoji: '🌊', color: '#3b82f6' },
      cyclone: { emoji: '🌀', color: '#8b5cf6' },
      fire: { emoji: '🔥', color: '#ef4444' },
      landslide: { emoji: '⛰️', color: '#84cc16' },
    };

    const config = iconConfig[disaster.type];
    const severityColor = disaster.severity === 'high' ? '#dc2626' : 
                         disaster.severity === 'medium' ? '#f59e0b' : '#16a34a';

    return L.divIcon({
      html: `
        <div class="relative">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg animate-pulse" 
               style="background-color: ${severityColor}; border: 2px solid white;">
            ${config.emoji}
          </div>
          <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full" 
               style="background-color: ${severityColor}; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        </div>
      `,
      className: 'disaster-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Custom icons for facilities
  const getFacilityIcon = (facility: EmergencyFacility) => {
    const iconConfig = {
      hospital: { emoji: '🏥', color: '#16a34a' },
      police: { emoji: '👮', color: '#3b82f6' },
      fire_station: { emoji: '🚒', color: '#dc2626' },
      shelter: { emoji: '🏠', color: '#8b5cf6' },
    };

    const config = iconConfig[facility.type];

    return L.divIcon({
      html: `
        <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shadow-md" 
             style="background-color: ${config.color}; border: 1px solid white;">
          ${config.emoji}
        </div>
      `,
      className: 'facility-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // User location icon
  const getUserLocationIcon = () => {
    return L.divIcon({
      html: `
        <div class="relative">
          <div class="w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
          <div class="absolute top-0 left-0 w-4 h-4 bg-blue-600 rounded-full"></div>
        </div>
      `,
      className: 'user-location-marker',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  };

  return (
    <div className="h-full w-full relative">
      <MapContainer
        // @ts-ignore - react-leaflet type issues
        center={[center.lat, center.lng]}
        zoom={6}
        className="h-full w-full rounded-2xl"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={center} />

        {/* User location marker */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng] as [number, number]} 
            // @ts-ignore - Leaflet icon types are complex
            icon={getUserLocationIcon()}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm">Your Location</h3>
                <p className="text-xs text-muted-foreground">
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Disaster markers */}
        {disasters.map((disaster) => (
          <Marker
            key={disaster.id}
            position={[disaster.location.lat, disaster.location.lng] as [number, number]}
            // @ts-ignore - Leaflet icon types are complex
            icon={getDisasterIcon(disaster)}
            eventHandlers={{
              click: () => onDisasterClick(disaster),
            }}
          >
            <Popup>
              <Card className="w-64 border-0 shadow-none">
                <div className="p-3 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm">{disaster.title}</h3>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        disaster.severity === 'high' ? 'severity-high' :
                        disaster.severity === 'medium' ? 'severity-medium' : 'severity-low'
                      }`}
                    >
                      {disaster.severity}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{disaster.description}</p>
                  
                  {disaster.magnitude && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Magnitude:</span>
                      <Badge variant="secondary">{disaster.magnitude}</Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(disaster.time).toLocaleString('en-IN')}</span>
                  </div>
                  
                  {disaster.url && (
                    <Button size="sm" variant="outline" className="w-full" asChild>
                      <a href={disaster.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        More Details
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            </Popup>
          </Marker>
        ))}

        {/* Emergency facility markers */}
        {facilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.location.lat, facility.location.lng] as [number, number]}
            // @ts-ignore - Leaflet icon types are complex
            icon={getFacilityIcon(facility)}
            eventHandlers={{
              click: () => onFacilityClick(facility),
            }}
          >
            <Popup>
              <Card className="w-56 border-0 shadow-none">
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm">{facility.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {facility.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  {facility.distance && (
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="h-3 w-3" />
                      <span>{facility.distance}km away</span>
                    </div>
                  )}
                  
                  {facility.contact && (
                    <div className="text-xs">
                      <span className="font-medium">Contact:</span> {facility.contact}
                    </div>
                  )}
                  
                  {facility.capacity && (
                    <div className="text-xs">
                      <span className="font-medium">Capacity:</span> {facility.capacity}
                    </div>
                  )}
                </div>
              </Card>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map legend */}
      <Card className="absolute bottom-4 right-4 glass border-border/20 z-[1000]">
        <div className="p-3 space-y-2">
          <h4 className="text-xs font-semibold">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
              <span>High Severity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-warning rounded-full"></div>
              <span>Medium Severity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span>Low Severity / Facilities</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-ocean-blue rounded-full animate-pulse"></div>
              <span>Your Location</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DisasterMap;