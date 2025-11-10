import React, { useState, useEffect, useCallback } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';
import WeatherWidget from '@/components/WeatherWidget';
import AnimatedBackground from '@/components/AnimatedBackground';
import DisasterList from '@/components/DisasterList';
import CopilotChat from '@/components/CopilotChat';
import DisasterGuidelines from '@/components/DisasterGuidelines';
import HeatmapOverview from '@/components/HeatmapOverview';
import EmergencyServicesMap from '@/components/EmergencyServicesMap';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DisasterEvent, 
  EmergencyFacility, 
  WeatherData, 
  Location 
} from '@/types';
import { 
  fetchDisasterData, 
  fetchEmergencyFacilities, 
  fetchWeatherData,
  getCurrentLocation,
  predictDisasters,
} from '@/utils/api';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<Location>({ lat: 20.5937, lng: 78.9629 }); // Center of India
  const [disasters, setDisasters] = useState<DisasterEvent[]>([]);
  const [predictedDisasters, setPredictedDisasters] = useState<DisasterEvent[]>([]);
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

  // Listen for tab change events from Dynamic Island
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
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
      const disasterData = await fetchDisasterData();
      setDisasters(disasterData);
      
      // Generate predictions based on historical data
      const predictions = predictDisasters(disasterData);
      setPredictedDisasters(predictions);
      
      console.log(`Loaded ${disasterData.length} real disasters and ${predictions.length} predictions`);
    } catch (error) {
      console.error('Error loading disaster data:', error);
      setDisasters([]);
      setPredictedDisasters([]);
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

  const handleFacilityClick = useCallback((facility: EmergencyFacility | any) => {
    // Handle both EmergencyService and EmergencyFacility types
    const location = facility.location 
      ? facility.location 
      : { lat: facility.lat, lng: facility.lng };
    
    setMapCenter(location);
    setActiveTab('overview');
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="h-full">
            <HeatmapOverview disasters={disasters} userLocation={userLocation} />
          </div>
        );

      case 'weather':
        return (
          <div className="h-full overflow-y-auto p-6">
            <WeatherWidget 
              weather={weather} 
              loading={loading.weather}
              onLocationChange={handleLocationSearch}
              userLocation={userLocation}
            />
          </div>
        );

      case 'disasters':
        return (
          <div className="h-full overflow-y-auto p-6">
            <DisasterList 
              disasters={[...disasters, ...predictedDisasters]} 
              onDisasterClick={handleDisasterClick}
              loading={loading.disasters}
              userLocation={userLocation}
            />
          </div>
        );

      case 'emergency-services':
        return (
          <div className="h-full">
            <EmergencyServicesMap onFacilityClick={handleFacilityClick} />
          </div>
        );

      case 'ai-insights':
        return (
          <div className="h-full">
            <CopilotChat userLocation={userLocation} />
          </div>
        );

      case 'guidelines':
        return (
          <div className="h-full overflow-y-auto p-6">
            <DisasterGuidelines />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />

      {/* Logo stays in place always */}
      
      <div className="relative z-10 h-screen">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onFacilityClick={handleFacilityClick}
          onLocationUpdate={handleLocationUpdate}
        />
        
        <main 
          className="w-full h-full pt-20"
        >
          {/* Tab Content - Full Height */}
          <div className="h-full">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;