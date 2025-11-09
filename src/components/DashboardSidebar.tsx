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
      className={`relative glass-strong h-full flex flex-col transition-all duration-500 ease-out overflow-hidden ${
        isCollapsed ? 'w-20' : 'w-80'
      }`}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 animate-shimmer" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-primary rounded-xl">
                    <Shield className="h-5 w-5 text-white animate-pulse" />
                  </div>
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Predict Aid
                  </h2>
                  <p className="text-xs text-muted-foreground">Control Center</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-300"
            >
              {isCollapsed ? (
                <Menu className="h-5 w-5 animate-pulse" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`
                  group relative w-full rounded-xl transition-all duration-300 animate-fade-in
                  ${isCollapsed ? 'p-3' : 'p-4'}
                  ${isActive 
                    ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg hover-glow' 
                    : 'hover:bg-accent/10 text-foreground hover:text-primary'
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent animate-shimmer" />
                )}
                
                <div className="relative flex items-center gap-3">
                  {/* Icon with animation */}
                  <div className={`
                    flex items-center justify-center transition-transform duration-300
                    ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                    ${isActive && !isCollapsed ? '' : 'group-hover:rotate-6'}
                  `}>
                    <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                  </div>
                  
                  {/* Label and description */}
                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {item.label}
                        </span>
                        <ChevronRight className={`
                          h-4 w-4 transition-transform duration-300
                          ${isActive ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-1'}
                        `} />
                      </div>
                      {isActive && (
                        <p className="text-xs opacity-90 mt-0.5 animate-fade-in">
                          {item.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer Stats */}
        {!isCollapsed && (
          <div className="p-4 border-t border-border/30 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              <Card className="glass p-3 hover-lift cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-success to-success/50 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-sm font-bold text-success">Live</p>
                  </div>
                </div>
              </Card>
              <Card className="glass p-3 hover-lift cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Flame className="h-4 w-4 text-white animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Alerts</p>
                    <p className="text-sm font-bold text-primary">{facilities.length}</p>
                  </div>
                </div>
              </Card>
            </div>
            <Badge className="w-full justify-center bg-gradient-primary border-0 text-white py-2">
              <Shield className="h-3 w-3 mr-1" />
              System Operational
            </Badge>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;