import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmergencyService, Location } from '@/types';
import { getCurrentLocation } from '@/utils/api';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Hospital, Shield, AlertTriangle, Phone, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmergencyServicesMapProps {
  onFacilityClick?: (facility: EmergencyService) => void;
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
  const [services, setServices] = useState<EmergencyService[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['hospital', 'police', 'fire_station']);
  const { toast } = useToast();

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

  // Get user location and load services
  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 13);
        }
        
        fetchNearbyServices(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: 'Location Error',
          description: 'Unable to get your location. Using default location.',
          variant: 'destructive',
        });
        // Default to Delhi
        const defaultLoc = { lat: 28.6139, lng: 77.2090 };
        setUserLocation(defaultLoc);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([defaultLoc.lat, defaultLoc.lng], 12);
        }
        
        fetchNearbyServices(defaultLoc.lat, defaultLoc.lng);
      }
    );
  };

  const fetchNearbyServices = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('nearby', {
        body: { lat, lng, types: selectedTypes.join(',') },
      });

      if (error) throw error;
      
      setServices(data.services || []);
      
      toast({
        title: 'Services Found',
        description: `Found ${data.services?.length || 0} nearby emergency services`,
      });
    } catch (error: any) {
      console.error('Error fetching services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load emergency services',
        variant: 'destructive',
      });
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh when selected types change
  useEffect(() => {
    if (userLocation) {
      fetchNearbyServices(userLocation.lat, userLocation.lng);
    }
  }, [selectedTypes]);

  // Update markers when services change
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

    // Add service markers
    services.forEach(service => {
      const icon = getFacilityIcon(service.type);
      const color = getFacilityColor(service.type);
      
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

      const marker = L.marker([service.lat, service.lng], { 
        icon: facilityIcon 
      })
        .bindPopup(`
          <div class="facility-popup">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${service.name}</h3>
            <p style="margin: 2px 0; font-size: 12px; color: #666;">
              <strong>Type:</strong> ${service.type.replace('_', ' ')}
            </p>
            <p style="margin: 2px 0; font-size: 12px; color: #666;">
              <strong>Distance:</strong> ${service.distance}km away
            </p>
            ${service.address ? `
              <p style="margin: 2px 0; font-size: 12px; color: #666;">
                <strong>Address:</strong> ${service.address}
              </p>
            ` : ''}
          </div>
        `)
        .on('click', () => {
          onFacilityClick?.(service);
        })
        .addTo(mapInstanceRef.current!);
      
      markersRef.current.push(marker);
    });
  }, [services, userLocation, onFacilityClick]);

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

  const serviceCounts = {
    hospital: services.filter(s => s.type === 'hospital').length,
    police: services.filter(s => s.type === 'police').length,
    fire_station: services.filter(s => s.type === 'fire_station').length,
  };

  const handleRefresh = () => {
    if (userLocation) {
      fetchNearbyServices(userLocation.lat, userLocation.lng);
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
              <p className="font-semibold text-sm mb-2">Filter by Type:</p>
              {[
                { id: 'hospital', label: 'Hospitals', icon: Hospital, count: serviceCounts.hospital },
                { id: 'police', label: 'Police', icon: Shield, count: serviceCounts.police },
                { id: 'fire_station', label: 'Fire Stations', icon: AlertTriangle, count: serviceCounts.fire_station },
              ].map(({ id, label, icon: Icon, count }) => (
                <label key={id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTypes([...selectedTypes, id]);
                      } else {
                        setSelectedTypes(selectedTypes.filter((t) => t !== id));
                      }
                    }}
                    className="rounded"
                  />
                  <Icon className="h-4 w-4" />
                  <span className="text-sm flex-1">{label}</span>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Sidebar with services list */}
      <div className="w-80 glass-strong border-l border-border/20 p-4 overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-2">Emergency Services</h2>
          <p className="text-sm text-muted-foreground">
            Nearby Services ({services.length})
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
            {services.map((service) => (
              <Card
                key={service.id}
                className="p-3 cursor-pointer hover:shadow-lg transition-smooth glass border-border/10"
                onClick={() => onFacilityClick?.(service)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {getFacilityIcon(service.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {service.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {service.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {service.distance}km away
                      </span>
                    </div>
                    {service.address && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {service.address}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            
            {services.length === 0 && !loading && (
              <div className="text-center py-8">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No emergency services found nearby
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