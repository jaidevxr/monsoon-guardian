import React, { useState, useEffect } from 'react';
import { MapPin, Cloud, AlertTriangle, Bot, Menu, X, Phone, Hospital, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmergencyFacility, Location } from '@/types';
import { fetchEmergencyFacilities, getCurrentLocation } from '@/utils/api';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFacilityClick: (facility: EmergencyFacility) => void;
  onLocationUpdate: (location: Location) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  onFacilityClick,
  onLocationUpdate,
}) => {
  const [facilities, setFacilities] = useState<EmergencyFacility[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  const navItems = [
    { id: 'overview', label: 'Heatmap', icon: MapPin },
    { id: 'weather', label: 'Weather', icon: Cloud },
    { id: 'disasters', label: 'Disasters', icon: AlertTriangle },
    { id: 'emergency-services', label: 'Emergency Map', icon: Hospital },
    { id: 'guidelines', label: 'Guidelines', icon: Shield },
    { id: 'ai-insights', label: 'AI Copilot', icon: Bot },
  ];

  useEffect(() => {
    const loadUserLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
        onLocationUpdate(location);
        loadEmergencyFacilities(location);
      } catch (error) {
        console.error('Error getting user location:', error);
      }
    };

    loadUserLocation();
  }, [onLocationUpdate]);

  const loadEmergencyFacilities = async (location: Location) => {
    setLoading(true);
    try {
      const data = await fetchEmergencyFacilities(location);
      setFacilities(data);
    } catch (error) {
      console.error('Error loading emergency facilities:', error);
    }
    setLoading(false);
  };

  const getFacilityIcon = (type: string) => {
    switch (type) {
      case 'hospital':
        return <Hospital className="h-4 w-4" />;
      case 'police':
        return <Shield className="h-4 w-4" />;
      case 'fire_station':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'hospital':
        return 'bg-success/10 text-success-foreground border-success/30';
      case 'police':
        return 'bg-ocean-blue/10 text-primary-foreground border-ocean-blue/30';
      case 'fire_station':
        return 'bg-destructive/10 text-destructive-foreground border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className={`glass-strong h-full flex flex-col transition-smooth ${isCollapsed ? 'w-16' : 'w-80'}`}>
      {/* Header */}
      <div className="p-4 border-b border-border/20">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="text-2xl">🌱</div>
              <h1 className="font-bold text-lg text-primary">Green Haven</h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'default' : 'ghost'}
              className={`w-full justify-start transition-smooth ${
                isCollapsed ? 'px-2' : ''
              } ${activeTab === item.id ? 'bg-primary text-primary-foreground shadow-md' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">{item.label}</span>}
            </Button>
          );
        })}
      </div>

      {/* Empty space - emergency facilities removed */}
    </div>
  );
};

export default DashboardSidebar;