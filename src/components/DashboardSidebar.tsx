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
      className={`fixed left-0 top-0 bottom-0 z-[2000] flex flex-col transition-all duration-300 ease-out overflow-hidden border-r border-border/20 shadow-xl bg-background/95 backdrop-blur-xl ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Gradient mesh background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary))_0%,transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,hsl(var(--accent))_0%,transparent_50%)]" />
      </div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />
      
      {/* Content */}
      <div className="flex flex-col h-full relative z-10">
        {/* Header */}
        <div className="p-3 border-b border-border/10">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg border border-primary/30 shadow-lg">
                  <Shield className="h-4 w-4 text-primary drop-shadow-glow" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Predict Aid</h2>
                  <p className="text-[10px] text-muted-foreground">Dashboard</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-8 w-8 p-0 hover:bg-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
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
                  group w-full rounded-xl transition-all duration-200 relative overflow-hidden
                  ${isCollapsed ? 'p-2.5' : 'p-2.5'}
                  ${isActive 
                    ? 'bg-gradient-to-r from-primary/20 to-accent/20 shadow-lg shadow-primary/20 text-primary border border-primary/20' 
                    : 'hover:bg-gradient-to-r hover:from-muted/60 hover:to-muted/40 hover:shadow-md hover:border hover:border-border/20'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 animate-pulse" />
                )}
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className={`p-1 rounded-lg ${isActive ? 'bg-background/50' : ''}`}>
                    <Icon className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isActive ? 'text-primary scale-110' : 'group-hover:scale-105'}`} />
                  </div>
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
          <div className="p-3 border-t border-border/10 bg-gradient-to-r from-muted/20 to-transparent">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-success border-success/30 text-[10px] shadow-sm">
                <Activity className="h-2.5 w-2.5 mr-1 animate-pulse" />
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