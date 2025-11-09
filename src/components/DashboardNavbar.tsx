import React, { useState } from 'react';
import { Shield, Clock, Zap, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DashboardNavbar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="glass-strong border-b border-border/20 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-primary rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gradient-primary rounded-xl shadow-lg">
              <Shield className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          
          <div className="flex flex-col">
            <h1 className="font-display font-bold text-xl md:text-2xl bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Predict Aid
            </h1>
            <Badge variant="outline" className="hidden sm:flex w-fit items-center gap-1 text-xs border-primary/30">
              <Sparkles className="h-3 w-3 text-primary" />
              AI-Powered Response
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <Badge className="hidden md:flex items-center gap-2 bg-gradient-secondary border-0 text-white px-4 py-2">
            <Zap className="h-3 w-3 animate-pulse" />
            <span className="font-medium">Live</span>
          </Badge>
          
          {/* Current time */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 glass rounded-xl">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm tabular-nums">
              {currentTime.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <Badge variant="secondary" className="text-xs font-semibold">IST</Badge>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;