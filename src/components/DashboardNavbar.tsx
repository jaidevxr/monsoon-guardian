import React, { useState } from 'react';
import { Search, Navigation, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { searchLocation } from '@/utils/api';
import { Location } from '@/types';

interface DashboardNavbarProps {
  onLocationSearch: (location: Location) => void;
}

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ onLocationSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchLocation(searchQuery);
      if (results.length > 0) {
        onLocationSearch(results[0]);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Search error:', error);
    }
    setIsSearching(false);
  };

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
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search location in India..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 glass border-border/30 focus:border-primary/50"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={isSearching || !searchQuery.trim()}
                className="bg-primary hover:bg-primary-glow"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </form>

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