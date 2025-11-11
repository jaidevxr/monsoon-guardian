import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Send, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Location, DisasterEvent } from '@/types';
import { EmergencyContact } from '@/types/emergency';
import EmergencyContactsDialog from './EmergencyContactsDialog';

interface EmergencySOSProps {
  userLocation: Location | null;
  nearbyDisasters?: DisasterEvent[];
}

const EmergencySOS: React.FC<EmergencySOSProps> = ({ userLocation, nearbyDisasters = [] }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  const getContactsFromStorage = (): EmergencyContact[] => {
    const saved = localStorage.getItem('emergencyContacts');
    return saved ? JSON.parse(saved) : [];
  };

  const handleSendAlert = async () => {
    const contacts = getContactsFromStorage();
    
    if (contacts.length === 0) {
      toast.error('No emergency contacts found. Please add contacts first.');
      setShowContactsDialog(true);
      setShowDialog(false);
      return;
    }

    if (!userLocation) {
      toast.error('Unable to get your location. Please enable location services.');
      return;
    }

    if (!status.trim()) {
      toast.error('Please describe your situation');
      return;
    }

    setSending(true);

    try {
      // Get address from location
      let address = undefined;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`
        );
        const data = await response.json();
        address = data.display_name;
      } catch (err) {
        console.error('Error getting address:', err);
      }

      // Prepare nearby disasters info
      const nearbyDisastersInfo = nearbyDisasters
        .slice(0, 5)
        .map(d => `${d.type.toUpperCase()}: ${d.title} (${d.severity})`);

      // Send alert via edge function
      const { data, error } = await supabase.functions.invoke('send-emergency-alert', {
        body: {
          contacts: contacts.map(c => ({ name: c.name, email: c.email })),
          userName: localStorage.getItem('userName') || 'A Saarthi User',
          location: {
            lat: userLocation.lat,
            lng: userLocation.lng,
            address,
          },
          status: status,
          timestamp: new Date().toISOString(),
          nearbyDisasters: nearbyDisastersInfo,
        },
      });

      if (error) throw error;

      toast.success(
        `Emergency alert sent to ${data.sent} contact${data.sent > 1 ? 's' : ''}!`,
        {
          description: 'Your emergency contacts have been notified with your location.',
        }
      );

      setShowDialog(false);
      setStatus('');
    } catch (error: any) {
      console.error('Error sending emergency alert:', error);
      toast.error('Failed to send emergency alert', {
        description: error.message || 'Please try again',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating SOS Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={() => setShowContactsDialog(true)}
          className="h-12 w-12 rounded-full shadow-lg bg-background/90 backdrop-blur-sm"
          title="Manage Emergency Contacts"
        >
          <Users className="h-5 w-5" />
        </Button>
        
        <Button
          size="lg"
          onClick={() => setShowDialog(true)}
          className="h-16 w-16 rounded-full shadow-2xl bg-destructive hover:bg-destructive/90 animate-pulse"
          title="Send Emergency Alert"
        >
          <AlertCircle className="h-8 w-8" />
        </Button>
      </div>

      {/* Emergency Alert Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Send Emergency Alert
            </DialogTitle>
            <DialogDescription>
              This will immediately notify your emergency contacts with your current location and status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {userLocation && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <MapPin className="h-4 w-4" />
                  Your Location
                </div>
                <div className="text-muted-foreground">
                  {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                </div>
              </div>
            )}

            {nearbyDisasters.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                <div className="font-semibold text-destructive mb-1">
                  ⚠️ {nearbyDisasters.length} Nearby Disaster{nearbyDisasters.length > 1 ? 's' : ''}
                </div>
                <div className="text-xs text-muted-foreground">
                  This information will be included in your alert
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Describe your situation *</Label>
              <Textarea
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="e.g., I'm safe but need assistance, evacuating to shelter, injured and need help..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Emergency contacts: {getContactsFromStorage().length}
              {getContactsFromStorage().length === 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 ml-2"
                  onClick={() => {
                    setShowDialog(false);
                    setShowContactsDialog(true);
                  }}
                >
                  Add contacts
                </Button>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSendAlert}
              disabled={sending || !status.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Emergency Alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Contacts Dialog */}
      <EmergencyContactsDialog
        open={showContactsDialog}
        onOpenChange={setShowContactsDialog}
      />
    </>
  );
};

export default EmergencySOS;
