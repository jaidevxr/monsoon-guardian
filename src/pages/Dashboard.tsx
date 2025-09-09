import React, { useState, useEffect, useCallback } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardNavbar from '@/components/DashboardNavbar';
import DisasterMap from '@/components/DisasterMap';
import WeatherWidget from '@/components/WeatherWidget';
import DisasterList from '@/components/DisasterList';
import AIChat from '@/components/AIChat';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DisasterEvent, 
  EmergencyFacility, 
  WeatherData, 
  Location 
} from '@/types';
import { 
  fetchEarthquakeData, 
  fetchEmergencyFacilities, 
  fetchWeatherData,
  getCurrentLocation,
  getFallbackDisasterData
} from '@/utils/api';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<Location>({ lat: 20.5937, lng: 78.9629 }); // Center of India
  const [disasters, setDisasters] = useState<DisasterEvent[]>([]);
  const [facilities, setFacilities] = useState<EmergencyFacility[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState({
    disasters: false,
    facilities: false,
    weather: false,
  });

  // Load initial data
  useEffect(() => {
    loadDisasterData();
  }, []);

  // Update data when user location changes
  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
      loadWeatherData(userLocation);
      loadNearbyFacilities(userLocation);
    }
  }, [userLocation]);

  const loadDisasterData = async () => {
    setLoading(prev => ({ ...prev, disasters: true }));
    try {
      const earthquakeData = await fetchEarthquakeData();
      if (earthquakeData.length > 0) {
        setDisasters(earthquakeData);
      } else {
        // Use fallback data for demo
        setDisasters(getFallbackDisasterData());
      }
    } catch (error) {
      console.error('Error loading disaster data:', error);
      setDisasters(getFallbackDisasterData());
    }
    setLoading(prev => ({ ...prev, disasters: false }));
  };

  const loadWeatherData = async (location: Location) => {
    setLoading(prev => ({ ...prev, weather: true }));
    try {
      const weatherData = await fetchWeatherData(location);
      setWeather(weatherData);
    } catch (error) {
      console.error('Error loading weather data:', error);
    }
    setLoading(prev => ({ ...prev, weather: false }));
  };

  const loadNearbyFacilities = async (location: Location) => {
    setLoading(prev => ({ ...prev, facilities: true }));
    try {
      const facilityData = await fetchEmergencyFacilities(location);
      setFacilities(facilityData);
    } catch (error) {
      console.error('Error loading facilities:', error);
    }
    setLoading(prev => ({ ...prev, facilities: false }));
  };

  const handleLocationUpdate = useCallback((location: Location) => {
    setUserLocation(location);
  }, []);

  const handleLocationSearch = useCallback((location: Location) => {
    setMapCenter(location);
    loadWeatherData(location);
    loadNearbyFacilities(location);
  }, []);

  const handleDisasterClick = useCallback((disaster: DisasterEvent) => {
    setMapCenter(disaster.location);
    setActiveTab('overview');
  }, []);

  const handleFacilityClick = useCallback((facility: EmergencyFacility) => {
    setMapCenter(facility.location);
    setActiveTab('overview');
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="h-full">
            <DisasterMap
              disasters={disasters}
              facilities={facilities}
              userLocation={userLocation}
              center={mapCenter}
              onDisasterClick={handleDisasterClick}
              onFacilityClick={handleFacilityClick}
            />
          </div>
        );

      case 'weather':
        return (
          <div className="h-full overflow-y-auto p-6">
            <WeatherWidget weather={weather} loading={loading.weather} />
          </div>
        );

      case 'disasters':
        return (
          <div className="h-full overflow-y-auto p-6">
            <DisasterList 
              disasters={disasters} 
              onDisasterClick={handleDisasterClick}
              loading={loading.disasters}
            />
          </div>
        );

      case 'ai-insights':
        return (
          <div className="h-full p-6">
            <AIChat 
              userLocation={userLocation}
              nearestFacilities={facilities}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar onLocationSearch={handleLocationSearch} />
      
      <div className="flex h-[calc(100vh-73px)]">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onFacilityClick={handleFacilityClick}
          onLocationUpdate={handleLocationUpdate}
        />
        
        <main className="flex-1 relative">
          {/* Tab Header */}
          <div className="glass border-b border-border/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground capitalize">
                  {activeTab.replace('-', ' ')}
                </h1>
                {activeTab === 'overview' && (
                  <Badge variant="outline" className="text-sm">
                    Live Data • {disasters.length} Active Events
                  </Badge>
                )}
              </div>
              
              {userLocation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>📍 Your location:</span>
                  <Badge variant="outline">
                    {userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="h-[calc(100%-73px)]">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;