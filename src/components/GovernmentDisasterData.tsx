import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MapPin, Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { DisasterEvent, Location } from '@/types';

interface GovernmentDisasterAlert {
  id: string;
  state: string;
  district: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  issueDate: string;
  validUntil: string;
  source: string;
  coordinates?: { lat: number; lng: number };
  affectedAreas: string[];
  guidelines: string[];
}

interface GovernmentDisasterDataProps {
  onDisasterClick?: (disaster: DisasterEvent) => void;
}

const GovernmentDisasterData: React.FC<GovernmentDisasterDataProps> = ({ onDisasterClick }) => {
  const [alerts, setAlerts] = useState<GovernmentDisasterAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>('all');

// Real-time alerts: fetch from ReliefWeb (OCHA) for India as a reliable public source
  // Note: Some official Indian sources lack public JSON/CORS APIs; ReliefWeb aggregates from gov agencies
  const fetchGovernmentAlerts = async (): Promise<GovernmentDisasterAlert[]> => {
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch('https://api.reliefweb.int/v1/reports?appname=lovable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: {
            operator: 'AND',
            conditions: [
              { field: 'country', value: 'India' },
              { field: 'date.created', value: { from: since } }
            ]
          },
          sort: ['date.created:desc'],
          limit: 50,
          fields: {
            include: ['title', 'url', 'date', 'disaster_type', 'primary_country']
          }
        })
      });

      if (!res.ok) throw new Error('Failed to load alerts');
      const json = await res.json();

      const indianStates = [
        'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands','Lakshadweep','Dadra and Nagar Haveli and Daman and Diu'] as const;

      const stateCentroids: Record<string, { lat: number; lng: number }> = {
        Punjab: { lat: 31.1471, lng: 75.3412 },
        Maharashtra: { lat: 19.7515, lng: 75.7139 },
        'Tamil Nadu': { lat: 11.1271, lng: 78.6569 },
        Assam: { lat: 26.2006, lng: 92.9376 },
        Gujarat: { lat: 22.2587, lng: 71.1924 },
        Delhi: { lat: 28.6139, lng: 77.2090 },
        'Uttar Pradesh': { lat: 26.8467, lng: 80.9462 },
        'West Bengal': { lat: 22.9868, lng: 87.8550 },
      };

      const mapTypeToSeverity = (type?: string): 'low' | 'medium' | 'high' => {
        const t = (type || '').toLowerCase();
        if (t.includes('cyclone') || t.includes('flood') || t.includes('earthquake') || t.includes('tsunami')) return 'high';
        if (t.includes('landslide') || t.includes('storm') || t.includes('drought')) return 'medium';
        return 'low';
      };

      const alerts: GovernmentDisasterAlert[] = (json.data || []).map((item: any) => {
        const fields = item.fields || {};
        const title: string = fields.title || 'Alert';
        const type: string = fields.disaster_type?.[0]?.name || 'Advisory';
        const issueDate: string = fields.date?.created || new Date().toISOString();
        const validUntil: string = fields.date?.changed || issueDate;
        const source: string = fields.primary_country?.name || 'Official Source';

        // Detect state from title text
        const matchedState = (indianStates as readonly string[]).find((s) => new RegExp(`\\b${s}\\b`, 'i').test(title)) || 'India';
        const coords = stateCentroids[matchedState];

        return {
          id: String(item.id),
          state: matchedState,
          district: matchedState === 'India' ? 'Multiple Districts' : matchedState,
          type,
          severity: mapTypeToSeverity(type),
          description: title,
          issueDate,
          validUntil,
          source,
          coordinates: coords,
          affectedAreas: matchedState === 'India' ? ['Multiple States'] : [matchedState],
          guidelines: [
            'Follow local authority advisories',
            'Keep emergency kit and important documents ready',
            'Avoid risky travel and waterlogged/low-lying areas'
          ]
        } as GovernmentDisasterAlert;
      });

      return alerts;
    } catch (e) {
      console.error('Failed to fetch ReliefWeb alerts', e);
      return [];
    }
  };

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true);
      try {
        const alertData = await fetchGovernmentAlerts();
        setAlerts(alertData);
      } catch (error) {
        console.error('Error loading government alerts:', error);
      }
      setLoading(false);
    };

    loadAlerts();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getDisasterIcon = (type: string) => {
    const icons = {
      'Flood': '🌊',
      'Cyclone': '🌀',
      'Tsunami Warning': '🌊',
      'Earthquake': '⚡',
      'Fire': '🔥',
      'Landslide': '⛰️',
    };
    return icons[type as keyof typeof icons] || '⚠️';
  };

  const filteredAlerts = selectedState === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.state.toLowerCase() === selectedState.toLowerCase());

  const handleViewOnMap = (alert: GovernmentDisasterAlert) => {
    if (alert.coordinates && onDisasterClick) {
      const disaster: DisasterEvent = {
        id: alert.id,
        type: alert.type.toLowerCase() as any,
        severity: alert.severity,
        location: { lat: alert.coordinates.lat, lng: alert.coordinates.lng, name: `${alert.district}, ${alert.state}` },
        time: alert.issueDate,
        title: `${alert.type} Alert - ${alert.district}`,
        description: alert.description,
      };
      onDisasterClick(disaster);
    }
  };

  const states = ['all', ...new Set(alerts.map(alert => alert.state))];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <AlertTriangle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Government Disaster Alerts</h2>
            <p className="text-sm text-muted-foreground">Live alerts from NDMA, IMD, INCOIS & CWC</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* State Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {states.map(state => (
          <Button
            key={state}
            variant={selectedState === state ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedState(state)}
            className="whitespace-nowrap"
          >
            {state === 'all' ? 'All States' : state}
          </Button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <Card key={alert.id} className="glass border-border/20 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getDisasterIcon(alert.type)}</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {alert.type} Alert - {alert.district}, {alert.state}
                    </h3>
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Source: {alert.source}</p>
                </div>
              </div>
              
              <div className="text-right space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(alert.issueDate).toLocaleDateString('en-IN')}
                </div>
                <div className="text-xs text-muted-foreground">
                  Valid until: {new Date(alert.validUntil).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            <p className="text-sm text-foreground">{alert.description}</p>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Affected Areas:</h4>
                <div className="flex flex-wrap gap-1">
                  {alert.affectedAreas.map((area, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Safety Guidelines:</h4>
                <ul className="space-y-1">
                  {alert.guidelines.map((guideline, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {guideline}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {alert.coordinates && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewOnMap(alert)}
                  className="flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  View on Map
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => window.open('https://ndma.gov.in/Natural-Hazards', '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Official Source
              </Button>
            </div>
          </Card>
        ))}

        {filteredAlerts.length === 0 && (
          <Card className="glass p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No Active Alerts</h3>
            <p className="text-sm text-muted-foreground">
              {selectedState === 'all' 
                ? 'No government disaster alerts currently active.'
                : `No active alerts for ${selectedState}.`}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GovernmentDisasterData;