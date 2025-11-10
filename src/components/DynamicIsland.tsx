import React, { useState, useEffect } from 'react';
import { Sun, Moon, MapPin, Cloud, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Location } from '@/types';

interface DynamicIslandProps {
  userLocation: Location | null;
}

interface WeatherData {
  temperature: number;
  weatherCode: number;
  description: string;
}

const DynamicIsland: React.FC<DynamicIslandProps> = ({ userLocation }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [cityName, setCityName] = useState<string>('Locating...');
  const [isExpanded, setIsExpanded] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

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

      // Fetch weather data with current_weather parameter for accurate real-time data including day/night
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lng}&current=temperature_2m,weather_code,is_day&timezone=auto`)
        .then(res => res.json())
        .then(data => {
          if (data.current) {
            const weatherCode = data.current.weather_code;
            const description = getWeatherDescription(weatherCode);
            setWeather({
              temperature: Math.round(data.current.temperature_2m),
              weatherCode,
              description
            });
            console.log('🌤️ Real-time weather:', { 
              temp: data.current.temperature_2m,
              code: weatherCode, 
              isDay: data.current.is_day,
              time: new Date().toLocaleString()
            });
          }
        })
        .catch((err) => {
          console.error('Failed to fetch weather:', err);
        });
    }
  }, [userLocation]);

  const getWeatherDescription = (code: number): string => {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 67) return 'Rainy';
    if (code <= 77) return 'Snowy';
    if (code <= 82) return 'Showers';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="h-4 w-4 text-amber-400" />;
    if (code <= 3) return <Cloud className="h-4 w-4 text-foreground" />;
    if (code <= 67) return <CloudRain className="h-4 w-4 text-primary" />;
    if (code <= 77) return <CloudSnow className="h-4 w-4 text-primary" />;
    return <Wind className="h-4 w-4 text-foreground" />;
  };

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div 
        className={`
          glass-strong border border-border/30 rounded-full 
          transition-all duration-300 ease-in-out
          will-change-[padding]
          ${isExpanded ? 'px-6 py-3' : 'px-4 py-2'}
        `}
      >
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0 rounded-full hover:bg-accent/20 transition-colors duration-200"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>

          {/* Divider */}
          <div 
            className={`
              h-6 w-px bg-border/30 
              transition-opacity duration-300 ease-in-out
              ${isExpanded ? 'opacity-100' : 'opacity-0'}
            `}
          />

          {/* Location Info */}
          <div 
            className={`
              flex items-center gap-3 text-sm overflow-hidden whitespace-nowrap
              transition-all duration-300 ease-in-out
              will-change-[max-width,opacity]
              ${isExpanded ? 'max-w-[600px] opacity-100' : 'max-w-0 opacity-0'}
            `}
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

            {/* Weather Info */}
            {weather && cityName !== 'Locating...' && (
              <>
                <div className="h-6 w-px bg-border/30" />
                <div className="flex items-center gap-1.5">
                  {getWeatherIcon(weather.weatherCode)}
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{weather.temperature}°C</span>
                    <span className="text-xs text-muted-foreground">{weather.description}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Compact Location Indicator */}
          <div 
            className={`
              flex items-center gap-1.5 whitespace-nowrap
              transition-all duration-300 ease-in-out
              will-change-[max-width,opacity]
              ${isExpanded ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}
            `}
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
