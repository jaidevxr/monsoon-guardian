import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WifiOff, Wifi, Download, HardDrive } from 'lucide-react';
import { getStorageUsage, getPendingAlerts } from '@/utils/offlineStorage';
import { toast } from 'sonner';
const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDetails, setShowDetails] = useState(false);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored', {
        description: 'You are back online'
      });
      checkPendingAlerts();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('No internet connection', {
        description: 'Working in offline mode'
      });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkPendingAlerts();
    updateStorageInfo();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const checkPendingAlerts = async () => {
    try {
      const pending = await getPendingAlerts();
      setPendingCount(pending.length);
      if (pending.length > 0 && navigator.onLine) {
        toast.info(`${pending.length} pending alert(s) will be sent`, {
          description: 'Syncing queued emergency alerts'
        });
      }
    } catch (error) {
      console.error('Error checking pending alerts:', error);
    }
  };
  const updateStorageInfo = async () => {
    try {
      const info = await getStorageUsage();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error getting storage info:', error);
    }
  };
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  return <>
      

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-amber-500" />}
              Connection Status
            </DialogTitle>
            <DialogDescription>
              {isOnline ? 'You are connected to the internet' : 'Working in offline mode with cached data'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Connection Status */}
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Status</span>
                <Badge variant={isOnline ? 'default' : 'secondary'}>
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
            </div>

            {/* Pending Alerts */}
            {pendingCount > 0 && <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-amber-600">
                    Pending Emergency Alerts
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pendingCount} alert{pendingCount > 1 ? 's' : ''} queued.
                  {isOnline ? ' Will be sent automatically.' : ' Will be sent when connection is restored.'}
                </p>
              </div>}

            {/* Storage Usage */}
            {storageInfo && <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-4 w-4" />
                  <span className="font-semibold">Offline Storage</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">
                      {formatBytes(storageInfo.usage)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available</span>
                    <span className="font-medium">
                      {formatBytes(storageInfo.quota)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{
                  width: `${storageInfo.percentage}%`
                }} />
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {storageInfo.percentage.toFixed(1)}% used
                  </div>
                </div>
              </div>}

            {/* Offline Features */}
            <div className="p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">Available Offline</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Emergency guidelines</li>
                <li>✓ Cached disaster information</li>
                <li>✓ Emergency contacts</li>
                <li>✓ Offline maps (limited area)</li>
                <li>✓ Weather data (last cached)</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>;
};
export default OfflineIndicator;