import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, Droplets, Wind, Thermometer, AlertCircle, Eye, MapPin, 
  Sunrise, Sunset, Gauge, CloudRain, CloudSnow, CloudDrizzle, 
  CloudFog, Zap, Snowflake, Sun, Moon, Umbrella, Navigation
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { WeatherData, WeatherAlert, Location } from '@/types';
import { searchLocation } from '@/utils/api';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading?: boolean;
  onLocationChange?: (location: Location) => void;
  userLocation?: Location | null;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather, loading, onLocationChange, userLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for city suggestions
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocation(searchQuery);
        setSearchResults(results.slice(0, 5));
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowDropdown(false);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectLocation = (location: Location) => {
    if (onLocationChange) {
      onLocationChange(location);
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass p-6 animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!weather) {
    return (
      <Card className="glass p-8 text-center">
        <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Weather Data Unavailable</h3>
        <p className="text-muted-foreground">
          Unable to fetch weather information. Please check your location settings.
        </p>
      </Card>
    );
  }

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme':
        return 'severity-high';
      case 'severe':
        return 'severity-medium';
      default:
        return 'severity-low';
    }
  };

  return (
    <div className="space-y-6">
      {/* City Search */}
      <Card className="glass p-4">
        <div className="space-y-3">
          <div ref={searchContainerRef} className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search city to view weather..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass border-border/30 focus:border-primary/50"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
            
            {/* Dropdown Results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectLocation(result)}
                    className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors border-b border-border last:border-0"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{result.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery.trim() && !isSearching && searchResults.length === 0 && showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 p-3">
                <p className="text-sm text-muted-foreground text-center">No cities found</p>
              </div>
            )}
          </div>
          
          {userLocation && weather && (
            <p className="text-xs text-muted-foreground text-center">
              Showing weather for: {weather.location.name || `${weather.location.lat.toFixed(4)}, ${weather.location.lng.toFixed(4)}`}
            </p>
          )}
        </div>
      </Card>

      {/* Current Weather - Enhanced */}
      <Card className="glass p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Cloud className="h-6 w-6" />
              Current Weather
            </h2>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {weather.location.name || `${weather.location.lat.toFixed(4)}, ${weather.location.lng.toFixed(4)}`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-primary">{weather.temperature}°C</div>
            <p className="text-muted-foreground capitalize mt-1">{weather.condition}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Feels like {weather.temperature - 2}°C
            </p>
          </div>
        </div>

        {/* Detailed Weather Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="p-2 rounded-lg bg-ocean-blue/10">
              <Droplets className="h-5 w-5 text-ocean-blue" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="font-semibold text-lg">{weather.humidity}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wind className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Wind Speed</p>
              <p className="font-semibold text-lg">{weather.windSpeed} km/h</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="p-2 rounded-lg bg-success/10">
              <CloudRain className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rainfall</p>
              <p className="font-semibold text-lg">{weather.rainfall} mm</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="p-2 rounded-lg bg-warning/10">
              <Eye className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Visibility</p>
              <p className="font-semibold text-lg">10 km</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="p-2 rounded-lg bg-accent/10">
              <Gauge className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pressure</p>
              <p className="font-semibold text-lg">1013 hPa</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Sunrise className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sunrise</p>
              <p className="font-semibold text-lg">6:30 AM</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Sunset className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sunset</p>
              <p className="font-semibold text-lg">6:45 PM</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Navigation className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Wind Dir.</p>
              <p className="font-semibold text-lg">NE</p>
            </div>
          </div>
        </div>

        {/* UV Index & Air Quality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-border/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-amber-500" />
                <span className="font-semibold">UV Index</span>
              </div>
              <Badge variant="outline" className="bg-amber-500/20 border-amber-500/30">
                Moderate
              </Badge>
            </div>
            <div className="space-y-2">
              <Progress value={60} className="h-2 bg-amber-100 dark:bg-amber-950" />
              <p className="text-xs text-muted-foreground">
                UV level is moderate. Use sun protection if outdoors.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-border/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Air Quality</span>
              </div>
              <Badge variant="outline" className="bg-green-500/20 border-green-500/30">
                Good
              </Badge>
            </div>
            <div className="space-y-2">
              <Progress value={75} className="h-2 bg-green-100 dark:bg-green-950" />
              <p className="text-xs text-muted-foreground">
                Air quality is good. Perfect conditions for outdoor activities.
              </p>
            </div>
          </div>
        </div>

        {/* Comfort Index */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-border/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-primary" />
              <span className="font-semibold">Comfort Level</span>
            </div>
            <span className="text-sm font-medium text-primary">
              {weather.temperature > 35 ? 'Very Hot' : 
               weather.temperature > 30 ? 'Hot' :
               weather.temperature > 25 ? 'Comfortable' :
               weather.temperature > 15 ? 'Cool' : 'Cold'}
            </span>
          </div>
          <Progress 
            value={Math.max(0, Math.min(100, (35 - Math.abs(weather.temperature - 25)) * 2))} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {weather.temperature > 30 ? 'Stay hydrated and avoid prolonged sun exposure' :
             weather.temperature > 25 ? 'Perfect weather for outdoor activities' :
             weather.temperature > 15 ? 'Light jacket recommended' :
             'Wear warm clothing'}
          </p>
        </div>
      </Card>

      {/* Weather Alerts - Enhanced */}
      {weather.alerts.length > 0 && (
        <Card className="glass p-6 border-destructive/30">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-destructive/10 animate-pulse">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-xl">Active Weather Alerts</h3>
              <p className="text-xs text-muted-foreground">{weather.alerts.length} active warning{weather.alerts.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="space-y-4">
            {weather.alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-5 rounded-xl border-2 transition-all hover:shadow-lg ${getAlertSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    <h4 className="font-semibold text-lg">{alert.title}</h4>
                  </div>
                  <Badge variant="outline" className={`${getAlertSeverityColor(alert.severity)} font-bold`}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm mb-4 leading-relaxed">{alert.description}</p>
                <div className="grid grid-cols-2 gap-3 p-3 bg-card/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Starts</p>
                    <p className="text-sm font-medium">{new Date(alert.start).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Ends</p>
                    <p className="text-sm font-medium">{new Date(alert.end).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 5-Day Forecast - Enhanced */}
      <Card className="glass p-6">
        <div className="flex items-center gap-2 mb-6">
          <Cloud className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-xl">5-Day Forecast</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {weather.forecast.slice(0, 5).map((day, index) => (
            <div 
              key={index} 
              className="text-center p-4 rounded-xl bg-gradient-to-br from-card/50 to-card/30 border border-border/30 hover:border-primary/30 transition-all hover:shadow-lg"
            >
              <p className="text-sm font-semibold text-foreground mb-2">
                {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              <div className="text-4xl mb-3">
                {day.icon || '☀️'}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Thermometer className="h-4 w-4 text-destructive" />
                  <p className="font-bold text-lg">{day.temperature.max}°</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Snowflake className="h-4 w-4 text-ocean-blue" />
                  <p className="text-sm text-muted-foreground">{day.temperature.min}°</p>
                </div>
                {day.rainfall > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-2 p-1 rounded bg-ocean-blue/10">
                    <Umbrella className="h-3 w-3 text-ocean-blue" />
                    <p className="text-xs font-medium text-ocean-blue">{day.rainfall}mm</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default WeatherWidget;