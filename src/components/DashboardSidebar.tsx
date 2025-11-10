import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Cloud, 
  AlertTriangle, 
  Bot, 
  Menu, 
  X, 
  Hospital, 
  Shield, 
  Flame,
  Activity,
  ChevronRight
} from 'lucide-react';
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
    { 
      id: 'overview', 
      label: 'Live Heatmap', 
      icon: Activity,
      gradient: 'from-primary to-accent',
      description: 'Real-time disaster tracking'
    },
    { 
      id: 'weather', 
      label: 'Weather Alerts', 
      icon: Cloud,
      gradient: 'from-secondary to-primary',
      description: 'AI-powered forecasts'
    },
    { 
      id: 'disasters', 
      label: 'Active Disasters', 
      icon: AlertTriangle,
      gradient: 'from-warning to-destructive',
      description: 'Live threat monitoring'
    },
    { 
      id: 'emergency-services', 
      label: 'Emergency Hub', 
      icon: Hospital,
      gradient: 'from-success to-primary',
      description: 'Nearest facilities'
    },
    { 
      id: 'guidelines', 
      label: 'Safety Guide', 
      icon: Shield,
      gradient: 'from-accent to-secondary',
      description: 'Emergency protocols'
    },
    { 
      id: 'ai-insights', 
      label: 'AI Copilot', 
      icon: Bot,
      gradient: 'from-primary via-accent to-secondary',
      description: 'Smart assistance'
    },
  ];

  useEffect(() => {
    const loadUserLocation = async () => {
      console.log('🔍 [DashboardSidebar] Starting location detection...');
      try {
        const location = await getCurrentLocation();
        console.log('✅ [DashboardSidebar] Location detected:', location);
        console.log(`📍 Coordinates: ${location.lat}, ${location.lng}`);
        setUserLocation(location);
        onLocationUpdate(location);
        loadEmergencyFacilities(location);
      } catch (error) {
        console.error('❌ [DashboardSidebar] Error getting user location:', error);
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
    <aside 
      className={`fixed left-4 top-4 bottom-4 z-50 flex flex-col transition-all duration-300 ease-out overflow-hidden rounded-2xl border border-border/20 shadow-2xl ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      style={{
        background: 'rgba(var(--background-rgb, 255, 255, 255), 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Content */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg border border-primary/20">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Predict Aid</h2>
                  <p className="text-[10px] text-muted-foreground">Dashboard</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`
                  group w-full rounded-xl transition-all duration-200 
                  ${isCollapsed ? 'p-2.5' : 'p-2.5'}
                  ${isActive 
                    ? 'bg-primary/20 shadow-md text-primary backdrop-blur-sm' 
                    : 'hover:bg-muted/40 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                  {!isCollapsed && (
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-xs">{item.label}</span>
                      {isActive && (
                        <span className="text-[10px] text-muted-foreground">{item.description}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-3 border-t border-border/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-success border-success/30 text-[10px]">
                <Activity className="h-2.5 w-2.5 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;