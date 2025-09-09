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

// Fetch earthquake data from USGS
export const fetchEarthquakeData = async (): Promise<DisasterEvent[]> => {
  try {
    const response = await axios.get(USGS_EARTHQUAKE_URL);
    const features = response.data.features;

    return features
      .filter((feature: any) => {
        const coords = feature.geometry.coordinates;
        // Filter for Indian region (rough bounds)
        return coords[1] >= 6 && coords[1] <= 37 && coords[0] >= 68 && coords[0] <= 97;
      })
      .map((feature: any) => {
        const coords = feature.geometry.coordinates;
        const props = feature.properties;
        
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (props.mag >= 6.0) severity = 'high';
        else if (props.mag >= 4.0) severity = 'medium';

        return {
          id: feature.id,
          type: 'earthquake' as const,
          severity,
          magnitude: props.mag,
          location: { lat: coords[1], lng: coords[0] },
          time: new Date(props.time).toISOString(),
          title: props.title,
          description: `Magnitude ${props.mag} earthquake`,
          url: props.url,
        };
      });
  } catch (error) {
    console.error('Error fetching earthquake data:', error);
    return [];
  }
};

// Fetch weather data from OpenWeatherMap
export const fetchWeatherData = async (location: Location): Promise<WeatherData | null> => {
  try {
    // Try to fetch real weather data first
    if (OPENWEATHER_API_KEY && OPENWEATHER_API_KEY !== '7c6a3b0b8f72c5a9d2e4f1a8c9b7e3d2') {
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );

      const forecastResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );

      const data = weatherResponse.data;
      const forecastData = forecastResponse.data;

      return {
        location,
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind?.speed * 3.6 || 0), // Convert m/s to km/h
        rainfall: data.rain?.['1h'] || 0,
        condition: data.weather[0].description,
        icon: data.weather[0].icon,
        alerts: [], // Would need separate alerts API call
        forecast: forecastData.list.slice(0, 5).map((item: any) => ({
          date: new Date(item.dt * 1000).toISOString().split('T')[0],
          temperature: {
            min: Math.round(item.main.temp_min),
            max: Math.round(item.main.temp_max)
          },
          rainfall: item.rain?.['3h'] || 0,
          condition: item.weather[0].description,
          icon: item.weather[0].icon,
        })),
      };
    }

    // Fallback to demo data if no API key
    return getFallbackWeatherData(location);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return getFallbackWeatherData(location);
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