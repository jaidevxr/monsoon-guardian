import React from 'react';
import { Cloud, Droplets, Wind, Thermometer, AlertCircle, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WeatherData, WeatherAlert } from '@/types';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading?: boolean;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather, loading }) => {
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
      {/* Current Weather */}
      <Card className="glass p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Current Weather</h2>
            <p className="text-muted-foreground">
              {weather.location.name || `${weather.location.lat.toFixed(2)}, ${weather.location.lng.toFixed(2)}`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-primary">{weather.temperature}°C</div>
            <p className="text-muted-foreground capitalize">{weather.condition}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-ocean-blue/10">
              <Droplets className="h-5 w-5 text-ocean-blue" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Humidity</p>
              <p className="font-semibold">{weather.humidity}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wind className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wind Speed</p>
              <p className="font-semibold">{weather.windSpeed} km/h</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Cloud className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rainfall</p>
              <p className="font-semibold">{weather.rainfall} mm</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Eye className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Visibility</p>
              <p className="font-semibold">Good</p>
            </div>
          </div>
        </div>

        {/* Comfort Index */}
        <div className="mt-6 p-4 rounded-xl bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Comfort Index</span>
            <span className="text-sm text-muted-foreground">
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
        </div>
      </Card>

      {/* Weather Alerts */}
      {weather.alerts.length > 0 && (
        <Card className="glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-lg">Weather Alerts</h3>
          </div>
          <div className="space-y-3">
            {weather.alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 rounded-xl border transition-smooth ${getAlertSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{alert.title}</h4>
                  <Badge variant="outline" className={getAlertSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-sm mb-3">{alert.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>From: {new Date(alert.start).toLocaleString('en-IN')}</span>
                  <span>Until: {new Date(alert.end).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 5-Day Forecast */}
      <Card className="glass p-6">
        <h3 className="font-semibold text-lg mb-4">5-Day Forecast</h3>
        <div className="grid grid-cols-5 gap-4">
          {weather.forecast.slice(0, 5).map((day, index) => (
            <div key={index} className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' })}
              </p>
              <div className="text-2xl mb-2">
                {day.icon || '☀️'}
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{day.temperature.max}°</p>
                <p className="text-sm text-muted-foreground">{day.temperature.min}°</p>
                <p className="text-xs text-ocean-blue">{day.rainfall}mm</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default WeatherWidget;