import React, { useState } from 'react';
import { AlertTriangle, MapPin, Clock, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DisasterEvent } from '@/types';

interface DisasterListProps {
  disasters: DisasterEvent[];
  onDisasterClick: (disaster: DisasterEvent) => void;
  loading?: boolean;
}

const DisasterList: React.FC<DisasterListProps> = ({ disasters, onDisasterClick, loading }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (disasters.length === 0) {
    return (
      <Card className="glass p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-success mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">No Active Disasters</h3>
        <p className="text-muted-foreground">
          Great news! There are currently no major disasters reported in your area.
        </p>
      </Card>
    );
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getDisasterIcon = (type: string) => {
    switch (type) {
      case 'earthquake':
        return '⚡';
      case 'flood':
        return '🌊';
      case 'cyclone':
        return '🌀';
      case 'fire':
        return '🔥';
      case 'landslide':
        return '⛰️';
      default:
        return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'severity-high';
      case 'medium':
        return 'severity-medium';
      default:
        return 'severity-low';
    }
  };

  const groupedDisasters = disasters.reduce((acc, disaster) => {
    if (!acc[disaster.type]) {
      acc[disaster.type] = [];
    }
    acc[disaster.type].push(disaster);
    return acc;
  }, {} as Record<string, DisasterEvent[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Active Disasters</h2>
        <Badge variant="outline" className="text-sm">
          {disasters.length} Active Alert{disasters.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {Object.entries(groupedDisasters).map(([type, typeDisasters]) => (
        <div key={type} className="space-y-3">
          <h3 className="font-semibold text-lg capitalize flex items-center gap-2">
            <span className="text-2xl">{getDisasterIcon(type)}</span>
            {type.replace('_', ' ')}s ({typeDisasters.length})
          </h3>
          
          <div className="space-y-3">
            {typeDisasters.map((disaster) => {
              const isExpanded = expandedItems.has(disaster.id);
              
              return (
                <Card 
                  key={disaster.id} 
                  className={`glass p-4 transition-smooth hover:shadow-lg cursor-pointer border ${getSeverityColor(disaster.severity)}`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-xl text-2xl ${getSeverityColor(disaster.severity)}`}>
                          {getDisasterIcon(disaster.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base mb-1">{disaster.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {disaster.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(disaster.time).toLocaleString('en-IN')}</span>
                            </div>
                            {disaster.location.name && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{disaster.location.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 ml-4">
                        <Badge variant="outline" className={getSeverityColor(disaster.severity)}>
                          {disaster.severity}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(disaster.id)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border/20 pt-4 space-y-4">
                        {disaster.magnitude && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">Magnitude:</span>
                            <Badge variant="secondary">{disaster.magnitude}</Badge>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Coordinates:</span>
                            <p className="text-muted-foreground">
                              {disaster.location.lat.toFixed(4)}, {disaster.location.lng.toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Event ID:</span>
                            <p className="text-muted-foreground font-mono">{disaster.id}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => onDisasterClick(disaster)}
                            className="bg-primary hover:bg-primary-glow"
                          >
                            <MapPin className="h-3 w-3 mr-2" />
                            View on Map
                          </Button>
                          
                          {disaster.url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={disaster.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-2" />
                                Details
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DisasterList;