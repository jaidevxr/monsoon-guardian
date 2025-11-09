import React, { useState } from 'react';
import { Navigation, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DashboardNavbar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="glass-strong border-b border-border/20 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🌱</div>
            <h1 className="font-bold text-xl text-primary hidden sm:block">
              Green Haven Dashboard
            </h1>
            <Badge variant="outline" className="hidden md:flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              India Disaster Response
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Current time */}
          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {currentTime.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <Badge variant="outline" className="text-xs">IST</Badge>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;