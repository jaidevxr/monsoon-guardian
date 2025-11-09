import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, MapPin, Loader2, Bot } from 'lucide-react';
import type { Location } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Copilot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [gettingLocation, setGettingLocation] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get user's location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGettingLocation(false);
          toast({
            title: "Location detected",
            description: "AI assistant is ready to help with your location",
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setGettingLocation(false);
          toast({
            title: "Location unavailable",
            description: "Using default location. Some features may be limited.",
            variant: "destructive",
          });
          // Fallback to Delhi
          setLocation({ lat: 28.6139, lng: 77.2090 });
        }
      );
    } else {
      setGettingLocation(false);
      setLocation({ lat: 28.6139, lng: 77.2090 });
    }
  }, [toast]);

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
          location,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto max-w-4xl h-screen flex flex-col p-4">
        {/* Header */}
        <div className="py-6 border-b border-border/40 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Disaster Response Copilot</h1>
                <p className="text-sm text-muted-foreground">AI Assistant for Emergency Management</p>
              </div>
            </div>
            {location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Location Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-2">
          {messages.length === 0 && (
            <Card className="p-8 text-center bg-card/50 backdrop-blur border-border/40">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Welcome to Disaster Response Copilot</h3>
              <p className="text-muted-foreground mb-4">
                {gettingLocation 
                  ? "Getting your location..." 
                  : "I can help you with weather, disaster risks, nearby emergency services, and active alerts."}
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
                className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-card border border-border/40 text-card-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
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
        <div className="border-t border-border/40 pt-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about weather, risks, nearby facilities, or alerts..."
              className="flex-1 bg-card border-border/40"
              disabled={loading || gettingLocation}
            />
            <Button
              onClick={handleSend}
              disabled={loading || gettingLocation || !input.trim()}
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
    </div>
  );
};

export default Copilot;
