import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json();

    if (!lat || !lng) {
      throw new Error('Latitude and longitude are required');
    }

    console.log(`Fetching weather for: ${lat}, ${lng}`);

    // Fetch current weather + forecast (One Call API 3.0)
    const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&exclude=minutely&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const oneCallResponse = await fetch(oneCallUrl);
    
    if (!oneCallResponse.ok) {
      throw new Error(`OpenWeather API error: ${oneCallResponse.statusText}`);
    }
    
    const oneCallData = await oneCallResponse.json();

    // Fetch air quality
    const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}`;
    const airQualityResponse = await fetch(airQualityUrl);
    const airQualityData = await airQualityResponse.json();

    // Process current weather
    const current = oneCallData.current;
    const weatherData = {
      temperature: Math.round(current.temp),
      feelsLike: Math.round(current.feels_like),
      humidity: current.humidity,
      pressure: current.pressure,
      windSpeed: Math.round(current.wind_speed * 3.6), // Convert m/s to km/h
      windDirection: current.wind_deg,
      visibility: Math.round(current.visibility / 1000), // Convert to km
      uvIndex: current.uvi,
      clouds: current.clouds,
      sunrise: current.sunrise,
      sunset: current.sunset,
      condition: current.weather[0].main,
      description: current.weather[0].description,
      icon: current.weather[0].icon,
      isDay: current.weather[0].icon.includes('d') ? 1 : 0,
    };

    // Process air quality
    const airQuality = airQualityData.list?.[0];
    const aqi = airQuality?.main?.aqi || 1;
    const airQualityInfo = {
      aqi,
      quality: ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqi - 1] || 'Unknown',
      pm25: airQuality?.components?.pm2_5 || 0,
      pm10: airQuality?.components?.pm10 || 0,
      no2: airQuality?.components?.no2 || 0,
      o3: airQuality?.components?.o3 || 0,
    };

    // Process hourly forecast (next 24 hours)
    const hourlyForecast = oneCallData.hourly.slice(0, 24).map((hour: any) => ({
      time: hour.dt,
      temperature: Math.round(hour.temp),
      feelsLike: Math.round(hour.feels_like),
      precipitation: Math.round((hour.pop || 0) * 100), // Probability of precipitation
      rain: hour.rain?.['1h'] || 0,
      humidity: hour.humidity,
      windSpeed: Math.round(hour.wind_speed * 3.6),
      condition: hour.weather[0].main,
      description: hour.weather[0].description,
      icon: hour.weather[0].icon,
    }));

    // Process daily forecast (next 7 days)
    const dailyForecast = oneCallData.daily.slice(0, 7).map((day: any) => ({
      date: day.dt,
      temperature: {
        min: Math.round(day.temp.min),
        max: Math.round(day.temp.max),
      },
      precipitation: Math.round((day.pop || 0) * 100),
      rain: day.rain || 0,
      humidity: day.humidity,
      windSpeed: Math.round(day.wind_speed * 3.6),
      condition: day.weather[0].main,
      description: day.weather[0].description,
      icon: day.weather[0].icon,
      sunrise: day.sunrise,
      sunset: day.sunset,
      uvIndex: day.uvi,
    }));

    // Process alerts
    const alerts = (oneCallData.alerts || []).map((alert: any) => ({
      id: `alert-${alert.start}`,
      title: alert.event,
      description: alert.description,
      severity: alert.tags?.includes('Extreme') ? 'extreme' : 
                alert.tags?.includes('Severe') ? 'severe' : 
                alert.tags?.includes('Moderate') ? 'moderate' : 'minor',
      start: new Date(alert.start * 1000).toISOString(),
      end: new Date(alert.end * 1000).toISOString(),
    }));

    console.log(`Weather data fetched successfully`);

    return new Response(
      JSON.stringify({
        current: weatherData,
        airQuality: airQualityInfo,
        hourly: hourlyForecast,
        daily: dailyForecast,
        alerts,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in weather function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
