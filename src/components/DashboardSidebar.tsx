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
    <>
      {/* Fixed Logo/Name Dynamic Island - Never Minimizes */}
      <div className="fixed left-4 top-4 z-[2001]">
        <div className="bg-background/20 backdrop-blur-[20px] backdrop-saturate-[150%] border border-white/[0.08] rounded-3xl p-4 shadow-2xl"
          style={{ WebkitBackdropFilter: 'blur(20px) saturate(150%)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20 flex-shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-foreground">Predict Aid</h2>
                <p className="text-xs text-muted-foreground/80">Dashboard</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-9 w-9 hover:bg-white/[0.08] transition-all duration-200 rounded-xl flex-shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Section - Collapsible */}
      <aside 
        className={`fixed left-4 top-24 bottom-4 z-[1999] flex flex-col transition-all duration-300 ease-out overflow-hidden border border-white/[0.08] rounded-3xl shadow-2xl bg-background/20 backdrop-blur-[20px] backdrop-saturate-[150%] ${
          isCollapsed ? 'w-0 opacity-0 pointer-events-none -translate-x-full' : 'w-56 opacity-100 translate-x-0'
        }`}
        style={{
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        }}
      >
      {/* Content */}
      <div className="flex flex-col h-full relative z-10">
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <div key={item.id} className="bg-white/[0.08] backdrop-blur-lg rounded-xl border border-white/[0.08] overflow-hidden">
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`
                    group w-full transition-all duration-200 relative px-3.5 py-3.5
                    ${isActive 
                      ? 'bg-white/[0.10] text-foreground' 
                      : 'hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <Icon className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <div className="flex flex-col items-start gap-0.5">
                      <span className={`font-medium text-sm whitespace-nowrap ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>{item.label}</span>
                      <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">{item.description}</span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-muted-foreground/80">Status</span>
            <Badge variant="outline" className="text-success border-success/30 text-[10px] bg-white/[0.04]">
              <Activity className="h-2.5 w-2.5 mr-1 animate-pulse" />
              Active
            </Badge>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};

export default DashboardSidebar;