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
          // Prioritize city, then county, then state district
          const city = data.address?.city || 
                       data.address?.county || 
                       data.address?.state_district || 
                       data.address?.town || 
                       data.address?.village || 
                       data.address?.state || 
                       'Unknown Location';
          setCityName(city);
          console.log('📍 City detected:', city);
        })
        .catch((err) => {
          console.error('Failed to get city name:', err);
          setCityName('Location detected');
        });
    }
  }, [userLocation]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      style={{ transform: 'translateZ(0)' }}
    >
      <div 
        className={`
          glass-strong border border-border/30 rounded-full 
          transition-[padding] duration-150 ease-out
          ${isExpanded ? 'px-6 py-3' : 'px-4 py-2'}
        `}
        style={{ transform: 'translateZ(0)' }}
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
              flex items-center gap-2 text-sm overflow-hidden whitespace-nowrap
              transition-[max-width,opacity] duration-150 ease-out
              ${isExpanded ? 'max-w-md opacity-100' : 'max-w-0 opacity-0'}
            `}
            style={{ transform: 'translateZ(0)' }}
          >
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-foreground truncate">
                {cityName === 'Locating...' ? 'Detecting location...' : cityName}
              </span>
              {userLocation && cityName !== 'Locating...' && (
                <span className="text-xs text-muted-foreground truncate">
                  {userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°
                </span>
              )}
            </div>
          </div>

          {/* Compact Location Indicator */}
          <div 
            className={`
              flex items-center gap-1.5 whitespace-nowrap
              transition-[max-width,opacity] duration-150 ease-out
              ${isExpanded ? 'max-w-0 opacity-0' : 'max-w-md opacity-100'}
            `}
            style={{ transform: 'translateZ(0)' }}
          >
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {cityName === 'Locating...' ? 'Detecting...' : cityName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicIsland;
