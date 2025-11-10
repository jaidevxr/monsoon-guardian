import React, { useState, useEffect } from 'react';
import { Sun, Moon, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Location } from '@/types';

interface DynamicIslandProps {
  userLocation: Location | null;
}

const DynamicIsland: React.FC<DynamicIslandProps> = ({ userLocation }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [cityName, setCityName] = useState<string>('Locating...');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    if (userLocation) {
      // Reverse geocoding to get city name
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`)
        .then(res => res.json())
        .then(data => {
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || 'Unknown';
          setCityName(city);
        })
        .catch(() => setCityName('Unknown'));
    }
  }, [userLocation]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div 
        className={`
          glass-strong border border-border/30 rounded-full 
          transition-all duration-300 ease-out
          ${isExpanded ? 'px-6 py-3' : 'px-4 py-2'}
        `}
      >
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0 rounded-full hover:bg-accent/20"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>

          {/* Divider */}
          <div className="h-6 w-px bg-border/30" />

          {/* Location Info */}
          <div 
            className={`
              flex items-center gap-2 text-sm overflow-hidden
              transition-all duration-300 ease-out
              ${isExpanded ? 'max-w-md opacity-100' : 'max-w-0 opacity-0'}
            `}
          >
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-foreground truncate">{cityName}</span>
              {userLocation && (
                <span className="text-xs text-muted-foreground truncate">
                  {userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°
                </span>
              )}
            </div>
          </div>

          {/* Compact Location Indicator */}
          <div 
            className={`
              flex items-center gap-1
              transition-all duration-300 ease-out
              ${isExpanded ? 'max-w-0 opacity-0' : 'max-w-md opacity-100'}
            `}
          >
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{cityName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicIsland;
