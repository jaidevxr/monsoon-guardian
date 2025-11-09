import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmergencyService } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Hospital, Shield, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmergencyServicesMapProps {
  onFacilityClick?: (facility: EmergencyService) => void;
}

const EmergencyServicesMap: React.FC<EmergencyServicesMapProps> = ({ onFacilityClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [services, setServices] = useState<EmergencyService[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["hospital", "police", "fire_station"]);
  const { toast } = useToast();

  const getUserLocation = () => {
    setLoading(true);
    
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser");
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support geolocation. Using default location.",
        variant: "destructive",
      });
      const defaultLoc: [number, number] = [28.6139, 77.2090];
      setUserLocation(defaultLoc);
      fetchNearbyServices(defaultLoc[0], defaultLoc[1]);
      return;
    }

    console.log("Requesting geolocation...");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Location found:", position.coords.latitude, position.coords.longitude);
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        
        toast({
          title: "Location Found",
          description: `Located at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        });
        
        fetchNearbyServices(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation error:", error.code, error.message);
        
        let errorMessage = "Unable to get your location. ";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Permission denied. Please allow location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "Unknown error occurred.";
        }
        
        toast({
          title: "Location Error",
          description: errorMessage + " Using Delhi as default.",
          variant: "destructive",
        });
        
        // Default to Delhi
        const defaultLoc: [number, number] = [28.6139, 77.2090];
        setUserLocation(defaultLoc);
        fetchNearbyServices(defaultLoc[0], defaultLoc[1]);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const fetchNearbyServices = async (lat: number, lng: number) => {
    console.log(`Fetching services for location: ${lat}, ${lng}`);
    console.log(`Selected types: ${selectedTypes.join(',')}`);
    
    try {
      const { data, error } = await supabase.functions.invoke("nearby", {
        body: { lat, lng, types: selectedTypes.join(",") },
      });

      console.log("Supabase response data:", data);
      console.log("Supabase response error:", error);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      if (!data || !data.services) {
        console.error("No services in response:", data);
        setServices([]);
        toast({
          title: "No Services",
          description: "No emergency services found in this area",
        });
        return;
      }
      
      console.log(`Setting ${data.services.length} services in state`);
      setServices(data.services);
      
      toast({
        title: "Services Loaded",
        description: `Found ${data.services.length} nearby emergency services`,
      });
    } catch (error: any) {
      console.error("Error fetching services:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load emergency services",
        variant: "destructive",
      });
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case "hospital":
        return <Hospital className="w-4 h-4" />;
      case "police":
        return <Shield className="w-4 h-4" />;
      case "fire_station":
        return <Flame className="w-4 h-4" />;
      default:
        return <Hospital className="w-4 h-4" />;
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
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

  useEffect(() => {
    getUserLocation();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (userLocation) {
      fetchNearbyServices(userLocation[0], userLocation[1]);
    }
  }, [selectedTypes]);

  // Update markers when services or location changes
  useEffect(() => {
    if (!mapInstanceRef.current) {
      console.log("Map not initialized yet");
      return;
    }

    console.log(`Updating map with ${services.length} services`);

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Center map on user location if available
    if (userLocation) {
      console.log(`Centering map on user location: ${userLocation}`);
      mapInstanceRef.current.setView(userLocation, 13);
      
      // Add user location marker
      const userMarker = L.marker(userLocation)
        .bindPopup('<strong>Your Location</strong>')
        .addTo(mapInstanceRef.current);
      markersRef.current.push(userMarker);
    }

    // Add service markers
    console.log("Adding service markers...");
    services.forEach((service, index) => {
      console.log(`Adding marker ${index + 1}/${services.length}:`, service.name, service.type);
      
      const marker = L.marker([service.lat, service.lng])
        .bindPopup(`
          <div style="min-width: 150px;">
            <strong>${service.name}</strong><br/>
            <span style="font-size: 12px; color: #666;">
              Type: ${service.type}<br/>
              Distance: ${service.distance.toFixed(2)} km
              ${service.address ? `<br/>Address: ${service.address}` : ''}
            </span>
          </div>
        `)
        .addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });
    
    console.log(`Added ${markersRef.current.length} total markers to map`);
  }, [services, userLocation]);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-96 bg-card border-r p-4 overflow-y-auto">
        <div className="mb-4">
          <Button
            onClick={getUserLocation}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding...
              </>
            ) : (
              <>
                <Hospital className="w-4 h-4 mr-2" />
                Find Nearby Services
              </>
            )}
          </Button>
        </div>

        {/* Service Type Filters */}
        <div className="mb-4 space-y-2">
          <p className="font-semibold text-sm">Filter by Type:</p>
          {[
            { id: "hospital", label: "Hospitals", icon: <Hospital className="w-4 h-4" /> },
            { id: "police", label: "Police", icon: <Shield className="w-4 h-4" /> },
            { id: "fire_station", label: "Fire Stations", icon: <Flame className="w-4 h-4" /> },
          ].map(({ id, label, icon }) => (
            <label key={id} className="flex items-center gap-2 cursor-pointer">
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
              {icon}
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>

        {/* Services List */}
        <div className="space-y-2">
          <p className="font-semibold text-sm mb-2">
            Nearby Services ({services.length})
          </p>
          {loading && (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading services...</p>
            </div>
          )}
          {!loading && services.length === 0 && (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">No services found</p>
            </div>
          )}
          {!loading && services.map((service) => (
            <Card key={service.id} className="p-3 hover:bg-accent cursor-pointer">
              <div className="flex items-start gap-2">
                {getServiceIcon(service.type)}
                <div className="flex-1">
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {service.distance.toFixed(2)} km away
                  </p>
                  {service.address && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {service.address}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <div ref={mapRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default EmergencyServicesMap;