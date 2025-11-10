import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, MapPin, Loader2, Bot, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Location } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  facilities?: Array<{
    name: string;
    type: string;
    lat: number;
    lng: number;
    distance: number;
    contact?: string;
  }>;
  userLocation?: Location;
}

interface CopilotChatProps {
  userLocation: Location | null;
}

const CopilotChat = ({ userLocation }: CopilotChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch location name when location changes
    if (userLocation) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`)
        .then(res => res.json())
        .then(data => {
          const address = data.address;
          const name = address.city || address.town || address.village || address.state || 'Unknown location';
          setLocationName(name);
        })
        .catch(err => console.error('Error fetching location name:', err));
    }
  }, [userLocation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('copilot-chat', {
        body: {
          messages: [...messages, userMessage],
          location: userLocation,
        },
      });

      if (error) {
        // Check for specific error types
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new Error('Rate limit reached. Please try again in a few moments.');
        }
        if (error.message.includes('402') || error.message.includes('payment required')) {
          throw new Error('AI service requires credits. Please contact support.');
        }
        throw error;
      }

      // Parse the response to extract facility data if present
      let facilities;
      let parsedUserLocation;
      
      // Try to extract JSON data from the response
      try {
        const jsonMatch = data.message.match(/\{[\s\S]*"facilities"[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          facilities = extracted.facilities;
          parsedUserLocation = extracted.userLocation;
        }
      } catch (e) {
        // If parsing fails, it's just regular text
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        facilities,
        userLocation: parsedUserLocation,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGetDirections = (facility: any, userLoc: Location) => {
    // Navigate to emergency page with route info
    navigate('/emergency', {
      state: {
        destination: {
          lat: facility.lat,
          lng: facility.lng,
          name: facility.name
        },
        origin: userLoc
      }
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border/40 bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">AI Copilot</h2>
              <p className="text-sm text-muted-foreground">Disaster Response Assistant</p>
            </div>
          </div>
          {userLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {locationName || `${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <Card className="p-8 text-center bg-card/50 backdrop-blur border-border/40">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Welcome to AI Copilot</h3>
            <p className="text-muted-foreground mb-4">
              I can help you with weather, disaster risks, nearby emergency services, and active alerts.
              {userLocation && locationName && (
                <span className="block mt-2 text-primary font-medium">
                  📍 Your location: {locationName}
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm max-w-md mx-auto">
              <div className="p-3 bg-muted/50 rounded-lg text-left">
                <p className="font-medium text-foreground">Try asking:</p>
                <p className="text-muted-foreground">"What's the weather here?"</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-left">
                <p className="font-medium text-foreground">Or:</p>
                <p className="text-muted-foreground">"Find nearby hospitals"</p>
              </div>
            </div>
          </Card>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] ${
                message.role === 'user'
                  ? 'ml-auto'
                  : ''
              }`}
            >
              <div
                className={`p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border/40 text-card-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              
              {/* Show facility action buttons for hospitals */}
              {message.role === 'assistant' && message.facilities && message.userLocation && (
                <div className="mt-3 space-y-2">
                  {message.facilities
                    .filter(f => f.type === 'hospital')
                    .slice(0, 5)
                    .map((facility, idx) => (
                      <Card key={idx} className="p-3 bg-card/50 border-border/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {facility.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(facility.distance / 1000).toFixed(1)} km away
                            </p>
                            {facility.contact && (
                              <p className="text-xs text-muted-foreground mt-1">
                                📞 {facility.contact}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleGetDirections(facility, message.userLocation!)}
                            className="shrink-0"
                          >
                            <Navigation className="w-3 h-3 mr-1" />
                            Directions
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border/40 p-4 rounded-2xl">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-border/40 bg-card/50 backdrop-blur">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about weather, risks, nearby facilities, or alerts..."
            className="flex-1 bg-background border-border/40"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CopilotChat;
