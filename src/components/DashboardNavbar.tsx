import React, { useState, useEffect, useRef } from 'react';
import { Search, Navigation, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { searchLocation } from '@/utils/api';
import { Location } from '@/types';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DashboardNavbarProps {
  onLocationSearch: (location: Location) => void;
}

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ onLocationSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Debounced search for city suggestions
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocation(searchQuery);
        setSearchResults(results.slice(0, 5)); // Show top 5 results
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectLocation = (location: Location) => {
    onLocationSearch(location);
    setSearchQuery('');
    setSearchResults([]);
    setOpen(false);
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
          {/* City Search with Dropdown */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="text"
                  placeholder="Use my city..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  className="pl-10 w-64 glass border-border/30 focus:border-primary/50"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-card border-border" align="start">
              <Command>
                <CommandList>
                  {searchQuery.trim() && !isSearching && searchResults.length === 0 ? (
                    <CommandEmpty>No cities found.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {searchResults.map((result, index) => (
                        <CommandItem
                          key={index}
                          onSelect={() => handleSelectLocation(result)}
                          className="cursor-pointer"
                        >
                          <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium">{result.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

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