import axios from 'axios';
import { DisasterEvent, WeatherData, EmergencyFacility, Location } from '@/types';

const OPENWEATHER_API_KEY = '7c6a3b0b8f72c5a9d2e4f1a8c9b7e3d2'; // Demo API key
const USGS_EARTHQUAKE_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';

// Get user's current location
export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
};

// Fetch comprehensive disaster data from multiple sources for India
export const fetchDisasterData = async (): Promise<DisasterEvent[]> => {
  const allDisasters: DisasterEvent[] = [];

  try {
    // 1. Fetch earthquakes from USGS (last 30 days, magnitude 2.5+)
    const earthquakeUrl = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    const earthquakeParams = new URLSearchParams({
      format: 'geojson',
      starttime: thirtyDaysAgo,
      endtime: today,
      minmagnitude: '2.5',
      minlatitude: '6',
      maxlatitude: '37',
      minlongitude: '68',
      maxlongitude: '97',
      orderby: 'time-asc'
    });

    const earthquakeResponse = await axios.get(`${earthquakeUrl}?${earthquakeParams}`);
    const earthquakes = earthquakeResponse.data.features || [];

    earthquakes.forEach((feature: any) => {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;
      
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (props.mag >= 6.0) severity = 'high';
      else if (props.mag >= 4.5) severity = 'medium';

      allDisasters.push({
        id: feature.id,
        type: 'earthquake',
        severity,
        magnitude: props.mag,
        location: { 
          lat: coords[1], 
          lng: coords[0],
          name: props.place || 'India'
        },
        time: new Date(props.time).toISOString(),
        title: props.title || `Magnitude ${props.mag} Earthquake`,
        description: `${props.place || 'Unknown location'} - Depth: ${coords[2]?.toFixed(1) || 'N/A'} km`,
        url: props.url,
      });
    });

    console.log(`Fetched ${earthquakes.length} earthquakes from USGS`);

  } catch (error) {
    console.error('Error fetching earthquake data:', error);
  }

  try {
    // 2. Fetch from GDACS (all disaster types)
    const gdacsUrl = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH';
    const gdacsResponse = await axios.get(gdacsUrl, {
      params: {
        fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        alertlevel: 'Orange;Red',
      }
    });

    const gdacsEvents = gdacsResponse.data.features || [];
    
    gdacsEvents.forEach((event: any) => {
      const coords = event.geometry?.coordinates;
      if (!coords) return;
      
      const lng = coords[0];
      const lat = coords[1];
      
      // Filter for Indian region
      if (lat < 6 || lat > 37 || lng < 68 || lng > 97) return;
      
      const props = event.properties;
      let disasterType: 'earthquake' | 'flood' | 'cyclone' | 'fire' | 'landslide' = 'earthquake';
      const eventType = (props.eventtype || '').toLowerCase();
      
      if (eventType.includes('fl')) disasterType = 'flood';
      else if (eventType.includes('tc') || eventType.includes('storm')) disasterType = 'cyclone';
      else if (eventType.includes('vo')) disasterType = 'fire';
      else if (eventType.includes('dr')) disasterType = 'landslide';

      let severity: 'low' | 'medium' | 'high' = 'medium';
      const alertLevel = (props.alertlevel || '').toLowerCase();
      if (alertLevel.includes('red')) severity = 'high';
      else if (alertLevel.includes('orange')) severity = 'medium';

      allDisasters.push({
        id: `gdacs-${props.eventid || Math.random()}`,
        type: disasterType,
        severity,
        magnitude: props.severity?.value,
        location: { 
          lat, 
          lng,
          name: props.country || 'India'
        },
        time: props.fromdate || new Date().toISOString(),
        title: props.name || `${disasterType} Alert`,
        description: props.htmldescription || props.description || `GDACS ${severity} alert`,
        url: `https://www.gdacs.org/report.aspx?eventid=${props.eventid}&eventtype=${props.eventtype}`,
      });
    });

    console.log(`Fetched ${gdacsEvents.filter((e: any) => {
      const c = e.geometry?.coordinates;
      return c && c[1] >= 6 && c[1] <= 37 && c[0] >= 68 && c[0] <= 97;
    }).length} GDACS events for India`);

  } catch (error) {
    console.error('Error fetching GDACS data:', error);
  }

  // Remove duplicates based on coordinates and time (within 1 hour)
  const uniqueDisasters = allDisasters.filter((disaster, index, self) => {
    return index === self.findIndex((d) => {
      const timeDiff = Math.abs(new Date(d.time).getTime() - new Date(disaster.time).getTime());
      const coordMatch = Math.abs(d.location.lat - disaster.location.lat) < 0.1 && 
                         Math.abs(d.location.lng - disaster.location.lng) < 0.1;
      return coordMatch && timeDiff < 3600000; // 1 hour
    });
  });

  // Sort by time (most recent first)
  uniqueDisasters.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  console.log(`Total unique disasters: ${uniqueDisasters.length}`);
  return uniqueDisasters;
};

// Legacy function for backward compatibility
export const fetchEarthquakeData = fetchDisasterData;

// Fetch weather data for multiple locations (for heatmap overlay)
export const fetchWeatherDataForMultipleLocations = async (
  locations: Location[]
): Promise<Map<string, { temp: number; rainfall: number }>> => {
  const weatherMap = new Map<string, { temp: number; rainfall: number }>();
  
  // Batch requests to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    
    const promises = batch.map(async (location) => {
      try {
        const params = new URLSearchParams({
          latitude: location.lat.toString(),
          longitude: location.lng.toString(),
          current: 'temperature_2m,precipitation',
          timezone: 'auto',
        });

        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params}`
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const key = `${location.lat.toFixed(2)},${location.lng.toFixed(2)}`;
        
        return {
          key,
          data: {
            temp: data.current?.temperature_2m || 0,
            rainfall: data.current?.precipitation || 0,
          }
        };
      } catch (error) {
        console.error('Error fetching weather for location:', location, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    results.forEach(result => {
      if (result) {
        weatherMap.set(result.key, result.data);
      }
    });
    
    // Small delay between batches to be respectful to the API
    if (i + batchSize < locations.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return weatherMap;
};

// Fetch weather data for OpenWeatherMap
export const fetchWeatherData = async (location: Location): Promise<WeatherData | null> => {
  try {
    // Use Open-Meteo (no API key required) for reliable, real weather data
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto`;
    const response = await axios.get(url);
    const data = response.data;

    const currentTemp = Math.round(data.current?.temperature_2m ?? 0);
    const humidity = Math.round(data.current?.relative_humidity_2m ?? 0);
    const wind = Math.round(data.current?.wind_speed_10m ?? 0); // already in km/h
    const rainfall = Math.round((data.current?.precipitation ?? 0) * 10) / 10;

    const forecast: WeatherData['forecast'] = [];
    if (data.daily?.time?.length) {
      for (let i = 0; i < Math.min(5, data.daily.time.length); i++) {
        forecast.push({
          date: data.daily.time[i],
          temperature: {
            min: Math.round(data.daily.temperature_2m_min[i]),
            max: Math.round(data.daily.temperature_2m_max[i]),
          },
          rainfall: Math.round((data.daily.precipitation_sum[i] ?? 0) * 10) / 10,
          condition: mapWeatherCodeToText(data.daily.weathercode?.[i]),
          icon: mapWeatherCodeToIcon(data.daily.weathercode?.[i]),
        });
      }
    }

    return {
      location,
      temperature: currentTemp,
      humidity,
      windSpeed: wind,
      rainfall,
      condition: mapWeatherCodeToText(data.daily?.weathercode?.[0] ?? data.current?.weathercode),
      icon: mapWeatherCodeToIcon(data.daily?.weathercode?.[0] ?? data.current?.weathercode),
      alerts: [],
      forecast,
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return getFallbackWeatherData(location);
  }
};

// Map Open-Meteo WMO weather codes to readable text and icons
const mapWeatherCodeToText = (code?: number): string => {
  switch (code) {
    case 0: return 'clear sky';
    case 1:
    case 2: return 'partly cloudy';
    case 3: return 'overcast';
    case 45:
    case 48: return 'fog';
    case 51:
    case 53:
    case 55: return 'drizzle';
    case 61:
    case 63:
    case 65: return 'rain';
    case 66:
    case 67: return 'freezing rain';
    case 71:
    case 73:
    case 75: return 'snow';
    case 80:
    case 81:
    case 82: return 'rain showers';
    case 95: return 'thunderstorm';
    case 96:
    case 99: return 'thunderstorm with hail';
    default: return 'unknown';
  }
};

const mapWeatherCodeToIcon = (code?: number): string => {
  switch (code) {
    case 0: return '01d';
    case 1:
    case 2: return '02d';
    case 3: return '04d';
    case 45:
    case 48: return '50d';
    case 51:
    case 53:
    case 55: return '09d';
    case 61:
    case 63:
    case 65: return '10d';
    case 66:
    case 67: return '13d';
    case 71:
    case 73:
    case 75: return '13d';
    case 80:
    case 81:
    case 82: return '09d';
    case 95:
    case 96:
    case 99: return '11d';
    default: return '02d';
  }
};

// Fallback weather data for demo
export const getFallbackWeatherData = (location: Location): WeatherData => {
  const baseTemp = 25 + Math.sin(location.lat / 10) * 10;
  return {
    location,
    temperature: Math.round(baseTemp),
    humidity: Math.round(60 + Math.random() * 30),
    windSpeed: Math.round(5 + Math.random() * 15),
    rainfall: Math.round(Math.random() * 10),
    condition: 'partly cloudy',
    icon: '02d',
    alerts: [
      {
        id: '1',
        title: 'Heavy Rainfall Alert',
        description: 'Moderate to heavy rainfall expected in the region for next 24 hours',
        severity: 'moderate',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
    ],
    forecast: Array.from({ length: 5 }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      temperature: {
        min: Math.round(baseTemp - 5 + Math.random() * 3),
        max: Math.round(baseTemp + 5 + Math.random() * 3)
      },
      rainfall: Math.round(Math.random() * 15),
      condition: ['sunny', 'partly cloudy', 'cloudy', 'light rain'][Math.floor(Math.random() * 4)],
      icon: ['01d', '02d', '03d', '10d'][Math.floor(Math.random() * 4)],
    })),
  };
};

// Fetch emergency facilities using Overpass API
export const fetchEmergencyFacilities = async (location: Location, radius: number = 10000): Promise<EmergencyFacility[]> => {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radius},${location.lat},${location.lng});
      node["amenity"="police"](around:${radius},${location.lat},${location.lng});
      node["amenity"="fire_station"](around:${radius},${location.lat},${location.lng});
      node["emergency"="assembly_point"](around:${radius},${location.lat},${location.lng});
      node["disaster:shelter"="yes"](around:${radius},${location.lat},${location.lng});
    );
    out body;
  `;

  try {
    const response = await axios.post(OVERPASS_API_URL, query, {
      headers: { 'Content-Type': 'text/plain' },
    });

    const elements = response.data.elements;

    return elements.map((element: any) => {
      const distance = calculateDistance(location, { lat: element.lat, lng: element.lon });
      
      let facilityType: 'shelter' | 'hospital' | 'police' | 'fire_station' = 'shelter';
      if (element.tags.amenity === 'hospital') facilityType = 'hospital';
      else if (element.tags.amenity === 'police') facilityType = 'police';
      else if (element.tags.amenity === 'fire_station') facilityType = 'fire_station';

      return {
        id: element.id.toString(),
        name: element.tags.name || `${facilityType.replace('_', ' ')} facility`,
        type: facilityType,
        location: { lat: element.lat, lng: element.lon },
        distance: Math.round(distance * 100) / 100,
        contact: element.tags.phone,
        capacity: element.tags.capacity ? parseInt(element.tags.capacity) : undefined,
        isOpen: element.tags.opening_hours !== 'closed',
      };
    }).sort((a: EmergencyFacility, b: EmergencyFacility) => (a.distance || 0) - (b.distance || 0));
  } catch (error) {
    console.error('Error fetching emergency facilities:', error);
    return [];
  }
};

// Geocoding search
export const searchLocation = async (query: string): Promise<Location[]> => {
  try {
    const response = await axios.get(NOMINATIM_API_URL, {
      params: {
        q: query,
        format: 'json',
        limit: 5,
        countrycodes: 'in', // Restrict to India
        addressdetails: 1,
      },
    });

    return response.data.map((result: any) => ({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name,
    }));
  } catch (error) {
    console.error('Error searching location:', error);
    return [];
  }
};

// Calculate distance between two points (Haversine formula)
export const calculateDistance = (point1: Location, point2: Location): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

// Fallback disaster data for demo
export const getFallbackDisasterData = (): DisasterEvent[] => [
  {
    id: '1',
    type: 'earthquake',
    severity: 'medium',
    magnitude: 4.2,
    location: { lat: 28.6139, lng: 77.2090, name: 'Delhi' },
    time: new Date().toISOString(),
    title: 'Magnitude 4.2 Earthquake',
    description: 'Moderate earthquake detected near Delhi region',
  },
  {
    id: '2',
    type: 'flood',
    severity: 'high',
    location: { lat: 26.8467, lng: 80.9462, name: 'Lucknow' },
    time: new Date(Date.now() - 3600000).toISOString(),
    title: 'Heavy Flooding Alert',
    description: 'Severe flooding reported in Lucknow due to heavy monsoon rains',
  },
];