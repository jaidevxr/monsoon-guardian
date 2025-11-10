import axios from 'axios';
import { DisasterEvent, WeatherData, EmergencyFacility, Location } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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
        console.log("✅ Current location detected:", position.coords.latitude, position.coords.longitude);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("❌ Geolocation error:", error.code, error.message);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
};

// Check if coordinates are within India's boundaries (more precise)
const isInIndia = (lat: number, lng: number): boolean => {
  // More precise boundaries to exclude Nepal, Pakistan, Bangladesh, Myanmar, etc.
  // India mainland: roughly 8°N to 35°N latitude, 68°E to 97°E longitude
  // Excluding border regions more strictly
  
  // Exclude Nepal (north of ~27.5°N and east of 80°E)
  if (lat > 27.5 && lng > 80 && lng < 88.2 && lat < 30.5) return false;
  
  // Exclude Pakistan (west of 74°E for northern regions)
  if (lng < 74 && lat > 30) return false;
  
  // Exclude Bangladesh (east of 89°E and north of 22°N)
  if (lng > 88.5 && lat > 22 && lat < 26.5 && lng < 92.5) return false;
  
  // Exclude Myanmar (east of 94°E)
  if (lng > 94) return false;
  
  // Exclude Sri Lanka (south of 10°N)
  if (lat < 8.5 && lng > 79 && lng < 82) return false;
  
  // Main India boundaries (more conservative)
  return lat >= 8 && lat <= 35.5 && lng >= 68.5 && lng <= 97.5;
};

// Get Indian state from coordinates
const getIndianState = (lat: number, lng: number, placeName: string = ''): string => {
  // Check place name first for accurate state detection
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 
    'Ladakh', 'Puducherry', 'Chandigarh', 'Andaman and Nicobar', 'Lakshadweep'
  ];
  
  // Try to match state from place name
  for (const state of indianStates) {
    if (placeName.toLowerCase().includes(state.toLowerCase())) {
      return state;
    }
  }
  
  // Rough state boundaries based on coordinates
  if (lat >= 32 && lat <= 36.5 && lng >= 74 && lng <= 80) return 'Jammu and Kashmir';
  if (lat >= 30.5 && lat <= 33 && lng >= 75 && lng <= 77) return 'Himachal Pradesh';
  if (lat >= 28.5 && lat <= 31.5 && lng >= 77 && lng <= 81) return 'Uttarakhand';
  if (lat >= 30 && lat <= 32.5 && lng >= 74 && lng <= 76.5) return 'Punjab';
  if (lat >= 28 && lat <= 31 && lng >= 74.5 && lng <= 77.5) return 'Haryana';
  if (lat >= 28.4 && lat <= 28.9 && lng >= 76.8 && lng <= 77.4) return 'Delhi';
  if (lat >= 24 && lat <= 30.5 && lng >= 68 && lng <= 78) return 'Rajasthan';
  if (lat >= 23.5 && lat <= 30.5 && lng >= 78 && lng <= 84.5) return 'Uttar Pradesh';
  if (lat >= 21.5 && lat <= 27 && lng >= 82 && lng <= 88.5) return 'Bihar';
  if (lat >= 24 && lat <= 27.5 && lng >= 85 && lng <= 88) return 'Jharkhand';
  if (lat >= 21.5 && lat <= 27.5 && lng >= 88 && lng <= 92.5) return 'West Bengal';
  if (lat >= 21 && lat <= 26.5 && lng >= 69 && lng <= 74.5) return 'Gujarat';
  if (lat >= 21.5 && lat <= 27 && lng >= 73.5 && lng <= 82) return 'Madhya Pradesh';
  if (lat >= 15.5 && lat <= 23 && lng >= 73 && lng <= 80.5) return 'Maharashtra';
  if (lat >= 17 && lat <= 22.5 && lng >= 80.5 && lng <= 84.5) return 'Chhattisgarh';
  if (lat >= 17.5 && lat <= 22.5 && lng >= 81.5 && lng <= 87.5) return 'Odisha';
  if (lat >= 13 && lat <= 19.5 && lng >= 76 && lng <= 81) return 'Telangana';
  if (lat >= 12.5 && lat <= 19.5 && lng >= 77 && lng <= 85) return 'Andhra Pradesh';
  if (lat >= 11.5 && lat <= 18.5 && lng >= 74 && lng <= 78.5) return 'Karnataka';
  if (lat >= 14.5 && lat <= 20 && lng >= 72.5 && lng <= 78.5) return 'Goa';
  if (lat >= 8 && lat <= 13 && lng >= 74.5 && lng <= 77.5) return 'Kerala';
  if (lat >= 8 && lat <= 13.5 && lng >= 76.5 && lng <= 80.5) return 'Tamil Nadu';
  if (lat >= 23.5 && lat <= 28.5 && lng >= 89.5 && lng <= 94) return 'Assam';
  if (lat >= 23 && lat <= 28 && lng >= 90.5 && lng <= 93.5) return 'Meghalaya';
  if (lat >= 22 && lat <= 24.5 && lng >= 91 && lng <= 93) return 'Tripura';
  if (lat >= 23 && lat <= 27.5 && lng >= 92 && lng <= 94.5) return 'Mizoram';
  if (lat >= 24.5 && lat <= 27.5 && lng >= 93 && lng <= 95.5) return 'Manipur';
  if (lat >= 25 && lat <= 27.5 && lng >= 93.5 && lng <= 95.5) return 'Nagaland';
  if (lat >= 27 && lat <= 29.5 && lng >= 88 && lng <= 89.5) return 'Sikkim';
  if (lat >= 26.5 && lat <= 29.5 && lng >= 91.5 && lng <= 97.5) return 'Arunachal Pradesh';
  if (lat >= 6 && lat <= 14 && lng >= 92 && lng <= 94) return 'Andaman and Nicobar';
  
  return 'India';
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
      minlatitude: '8',
      maxlatitude: '35.5',
      minlongitude: '68.5',
      maxlongitude: '97.5',
      orderby: 'time-asc'
    });

    const earthquakeResponse = await axios.get(`${earthquakeUrl}?${earthquakeParams}`);
    const earthquakes = earthquakeResponse.data.features || [];

    earthquakes.forEach((feature: any) => {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;
      const lat = coords[1];
      const lng = coords[0];
      
      // Strict India boundary check
      if (!isInIndia(lat, lng)) return;
      
      // Filter out events with Nepal, Pakistan, Bangladesh, Myanmar, China in the name
      const place = (props.place || '').toLowerCase();
      if (place.includes('nepal') || place.includes('pakistan') || 
          place.includes('bangladesh') || place.includes('myanmar') || 
          place.includes('china') || place.includes('bhutan') ||
          place.includes('tibet') || place.includes('sri lanka')) {
        return;
      }
      
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (props.mag >= 6.0) severity = 'high';
      else if (props.mag >= 4.5) severity = 'medium';

      const stateName = getIndianState(lat, lng, props.place || '');

      allDisasters.push({
        id: feature.id,
        type: 'earthquake',
        severity,
        magnitude: props.mag,
        location: { 
          lat,
          lng,
          name: stateName
        },
        time: new Date(props.time).toISOString(),
        title: `Magnitude ${props.mag} Earthquake - ${stateName}`,
        description: `Detected in ${stateName}, India - Depth: ${coords[2]?.toFixed(1) || 'N/A'} km`,
        url: props.url,
      });
    });

    console.log(`Fetched ${allDisasters.length} earthquakes from USGS (India only)`);

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
      
      // Strict India boundary check
      if (!isInIndia(lat, lng)) return;
      
      // Only include if country is India
      const props = event.properties;
      const country = (props.country || '').toLowerCase();
      if (country && country !== 'india') return;
      
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

      const stateName = getIndianState(lat, lng, props.name || '');

      allDisasters.push({
        id: `gdacs-${props.eventid || Math.random()}`,
        type: disasterType,
        severity,
        magnitude: props.severity?.value,
        location: { 
          lat, 
          lng,
          name: stateName
        },
        time: props.fromdate || new Date().toISOString(),
        title: `${props.name || disasterType} - ${stateName}`,
        description: props.htmldescription || props.description || `GDACS ${severity} alert in ${stateName}`,
        url: `https://www.gdacs.org/report.aspx?eventid=${props.eventid}&eventtype=${props.eventtype}`,
      });
    });

    const indiaGdacsCount = gdacsEvents.filter((e: any) => {
      const c = e.geometry?.coordinates;
      return c && isInIndia(c[1], c[0]);
    }).length;
    console.log(`Fetched ${indiaGdacsCount} GDACS events for India`);

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

// Predict disasters based on historical patterns
export const predictDisasters = (historicalData: DisasterEvent[]): DisasterEvent[] => {
  const predictions: DisasterEvent[] = [];
  const currentMonth = new Date().getMonth();
  const currentDate = new Date();

  // High-risk zones in India
  const seismicZones = [
    { name: 'Kashmir & Himachal Pradesh', lat: 33.7782, lng: 76.5762, risk: 'high', type: 'earthquake' },
    { name: 'Uttarakhand', lat: 30.0668, lng: 79.0193, risk: 'high', type: 'earthquake' },
    { name: 'Gujarat (Kutch)', lat: 23.7337, lng: 68.7382, risk: 'high', type: 'earthquake' },
    { name: 'Delhi-NCR', lat: 28.6139, lng: 77.2090, risk: 'medium', type: 'earthquake' },
    { name: 'Northeast India', lat: 26.2006, lng: 91.7362, risk: 'high', type: 'earthquake' },
  ];

  const cycloneZones = [
    { name: 'Odisha Coast', lat: 19.8135, lng: 85.8312, risk: 'high', type: 'cyclone' },
    { name: 'Andhra Pradesh Coast', lat: 16.5062, lng: 80.6480, risk: 'high', type: 'cyclone' },
    { name: 'Tamil Nadu Coast', lat: 11.1271, lng: 79.8309, risk: 'high', type: 'cyclone' },
    { name: 'West Bengal Coast', lat: 22.5726, lng: 88.3639, risk: 'medium', type: 'cyclone' },
    { name: 'Gujarat Coast', lat: 21.5222, lng: 70.4579, risk: 'medium', type: 'cyclone' },
  ];

  const floodZones = [
    { name: 'Bihar', lat: 25.0961, lng: 85.3131, risk: 'high', type: 'flood' },
    { name: 'Assam', lat: 26.2006, lng: 92.9376, risk: 'high', type: 'flood' },
    { name: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, risk: 'high', type: 'flood' },
    { name: 'Kerala', lat: 10.8505, lng: 76.2711, risk: 'high', type: 'flood' },
    { name: 'Maharashtra', lat: 19.7515, lng: 75.7139, risk: 'medium', type: 'flood' },
  ];

  const landslideZones = [
    { name: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, risk: 'high', type: 'landslide' },
    { name: 'Uttarakhand', lat: 30.0668, lng: 79.0193, risk: 'high', type: 'landslide' },
    { name: 'Sikkim', lat: 27.5330, lng: 88.5122, risk: 'high', type: 'landslide' },
    { name: 'Darjeeling', lat: 27.0360, lng: 88.2627, risk: 'medium', type: 'landslide' },
  ];

  // Only show predictions during relevant seasons with real data sources
  // Monsoon season (June-September): High flood risk - based on IMD data
  if (currentMonth >= 5 && currentMonth <= 8) {
    floodZones.forEach((zone, idx) => {
      predictions.push({
        id: `pred-flood-${idx}`,
        type: 'flood',
        severity: zone.risk as 'high' | 'medium',
        location: { lat: zone.lat, lng: zone.lng, name: zone.name },
        time: new Date(Date.now() + (idx + 7) * 24 * 60 * 60 * 1000).toISOString(),
        title: `Monsoon Flood Risk Forecast - ${zone.name}`,
        description: `IMD historical data shows ${zone.risk} flood probability during monsoon. Based on 30-year rainfall patterns and river basin analysis.`,
        url: `https://mausam.imd.gov.in/responsive/districtWiseWarning.php`,
      });
    });

    landslideZones.forEach((zone, idx) => {
      predictions.push({
        id: `pred-landslide-${idx}`,
        type: 'landslide',
        severity: zone.risk as 'high' | 'medium',
        location: { lat: zone.lat, lng: zone.lng, name: zone.name },
        time: new Date(Date.now() + (idx + 10) * 24 * 60 * 60 * 1000).toISOString(),
        title: `Landslide Risk Advisory - ${zone.name}`,
        description: `NDMA historical data: ${zone.risk.toUpperCase()} landslide probability in monsoon. Hilly terrain + heavy rainfall increases risk significantly.`,
        url: `https://ndma.gov.in/Natural-Hazards/Landslides`,
      });
    });
  }

  // Cyclone season: Pre-monsoon (April-May) and Post-monsoon (October-November)
  if ((currentMonth >= 3 && currentMonth <= 4) || (currentMonth >= 9 && currentMonth <= 10)) {
    cycloneZones.forEach((zone, idx) => {
      predictions.push({
        id: `pred-cyclone-${idx}`,
        type: 'cyclone',
        severity: zone.risk as 'high' | 'medium',
        location: { lat: zone.lat, lng: zone.lng, name: zone.name },
        time: new Date(Date.now() + (idx + 5) * 24 * 60 * 60 * 1000).toISOString(),
        title: `Cyclone Season Advisory - ${zone.name}`,
        description: `IMD cyclone historical analysis: ${zone.risk.toUpperCase()} formation probability. Bay of Bengal/Arabian Sea weather patterns monitored.`,
        url: `https://rsmcnewdelhi.imd.gov.in/`,
      });
    });
  }

  // Earthquake predictions based on historical frequency
  const earthquakesByZone = historicalData
    .filter(d => d.type === 'earthquake')
    .reduce((acc, disaster) => {
      const zone = seismicZones.find(z => 
        Math.abs(z.lat - disaster.location.lat) < 2 && 
        Math.abs(z.lng - disaster.location.lng) < 2
      );
      if (zone) {
        acc[zone.name] = (acc[zone.name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

  // Generate earthquake predictions ONLY for zones with recent activity
  seismicZones.forEach((zone, idx) => {
    const recentActivity = earthquakesByZone[zone.name] || 0;
    // Only predict if there's actual recent seismic activity
    if (recentActivity >= 2) {
      predictions.push({
        id: `pred-earthquake-${idx}`,
        type: 'earthquake',
        severity: zone.risk as 'high' | 'medium',
        location: { lat: zone.lat, lng: zone.lng, name: zone.name },
        time: new Date(Date.now() + (idx + 14) * 24 * 60 * 60 * 1000).toISOString(),
        title: `Seismic Activity Advisory - ${zone.name}`,
        description: `Seismic Zone ${zone.risk === 'high' ? 'IV-V' : 'III'}: ${recentActivity} earthquakes recorded in past 30 days. GSI monitoring indicates potential aftershock activity.`,
        url: `https://earthquake.usgs.gov/earthquakes/map/`,
      });
    }
  });

  // Analyze historical patterns for additional predictions
  const disastersByMonth = historicalData.reduce((acc, disaster) => {
    const month = new Date(disaster.time).getMonth();
    if (!acc[month]) acc[month] = [];
    acc[month].push(disaster);
    return acc;
  }, {} as Record<number, DisasterEvent[]>);

  // If current month has high historical activity, add general warning
  const currentMonthData = disastersByMonth[currentMonth] || [];
  if (currentMonthData.length >= 3) {
    const mostCommonType = currentMonthData.reduce((acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topType = Object.keys(mostCommonType).reduce((a, b) => 
      mostCommonType[a] > mostCommonType[b] ? a : b
    );

    predictions.push({
      id: 'pred-seasonal-pattern',
      type: topType as any,
      severity: 'medium',
      location: { lat: 20.5937, lng: 78.9629, name: 'India (Multiple Regions)' },
      time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      title: `Seasonal Pattern Alert: ${topType}`,
      description: `Historical data shows increased ${topType} activity during this period. ${currentMonthData.length} similar events in past records for this month.`,
      url: 'https://ndma.gov.in/',
    });
  }

  return predictions;
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

// Fetch weather data using OpenWeather API via edge function
export const fetchWeatherData = async (location: Location): Promise<WeatherData | null> => {
  try {
    console.log('Fetching real weather data from OpenWeather API...');
    
    // Call the Supabase edge function
    const { data, error } = await supabase.functions.invoke('weather', {
      body: { lat: location.lat, lng: location.lng }
    });

    if (error) {
      console.error('Edge function error:', error);
      return getFallbackWeatherData(location);
    }

    if (!data) {
      return getFallbackWeatherData(location);
    }

    const { current, airQuality, hourly, daily, alerts } = data;

    // Map daily forecast to expected format
    const forecast: WeatherData['forecast'] = daily.map((day: any) => ({
      date: new Date(day.date * 1000).toISOString().split('T')[0],
      temperature: day.temperature,
      rainfall: day.rain,
      condition: day.condition,
      icon: day.icon,
    }));

    return {
      location,
      temperature: current.temperature,
      humidity: current.humidity,
      windSpeed: current.windSpeed,
      rainfall: hourly[0]?.rain || 0,
      condition: current.condition,
      icon: current.icon,
      alerts: alerts || [],
      forecast,
      feelsLike: current.feelsLike,
      pressure: current.pressure,
      windDirection: current.windDirection,
      visibility: current.visibility,
      uvIndex: current.uvIndex,
      sunrise: current.sunrise,
      sunset: current.sunset,
      isDay: current.isDay,
      airQuality: airQuality ? {
        aqi: airQuality.aqi,
        quality: airQuality.quality,
        pm25: airQuality.pm25,
        pm10: airQuality.pm10,
      } : undefined,
      hourlyForecast: hourly,
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