import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, location } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    console.log('Received request with location:', location);

    // Define tools for the LLM
    const tools = [
      {
        type: "function",
        function: {
          name: "getWeather",
          description: "Get current weather data for a location",
          parameters: {
            type: "object",
            properties: {
              lat: { type: "number", description: "Latitude" },
              lng: { type: "number", description: "Longitude" }
            },
            required: ["lat", "lng"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getRisk",
          description: "Get disaster risk assessment for a location",
          parameters: {
            type: "object",
            properties: {
              lat: { type: "number", description: "Latitude" },
              lng: { type: "number", description: "Longitude" }
            },
            required: ["lat", "lng"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getNearby",
          description: "Get nearby emergency facilities like hospitals, police stations, fire stations",
          parameters: {
            type: "object",
            properties: {
              lat: { type: "number", description: "Latitude" },
              lng: { type: "number", description: "Longitude" },
              radius: { type: "number", description: "Search radius in meters", default: 5000 }
            },
            required: ["lat", "lng"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getAlerts",
          description: "Get current disaster alerts and warnings for India",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      }
    ];

    // System prompt
    const systemMessage = {
      role: "system",
      content: `You are a disaster response AI assistant for India. You help users with:
- Weather information and forecasts
- Disaster risk assessments
- Finding nearby emergency services (hospitals, police, fire stations)
- Current disaster alerts and warnings

When users ask about conditions "here" or "my location", use the provided location data.
Always be concise, helpful, and prioritize safety information.`
    };

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [systemMessage, ...messages],
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    const data = await response.json();
    console.log('Groq response:', JSON.stringify(data));

    // Check if the model wants to call tools
    if (data.choices[0].message.tool_calls) {
      const toolCalls = data.choices[0].message.tool_calls;
      const toolResults = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        let args = JSON.parse(toolCall.function.arguments);

        // Auto-fill location if not provided
        if ((functionName === 'getWeather' || functionName === 'getRisk' || functionName === 'getNearby') 
            && (!args.lat || !args.lng) && location) {
          args.lat = location.lat;
          args.lng = location.lng;
        }

        console.log(`Calling ${functionName} with args:`, args);
        let result;

        try {
          switch (functionName) {
            case 'getWeather':
              result = await getWeather(args.lat, args.lng);
              break;
            case 'getRisk':
              result = await getRisk(args.lat, args.lng);
              break;
            case 'getNearby':
              result = await getNearby(args.lat, args.lng, args.radius || 5000);
              break;
            case 'getAlerts':
              result = await getAlerts();
              break;
            default:
              result = { error: 'Unknown function' };
          }
        } catch (error) {
          console.error(`Error calling ${functionName}:`, error);
          result = { error: error.message };
        }

        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(result)
        });
      }

      // Call Groq again with tool results
      const finalResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            systemMessage,
            ...messages,
            data.choices[0].message,
            ...toolResults
          ],
          temperature: 0.7,
          max_tokens: 1000
        }),
      });

      const finalData = await finalResponse.json();
      console.log('Final response:', JSON.stringify(finalData));

      return new Response(JSON.stringify({ 
        message: finalData.choices[0].message.content 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No tool calls, return direct response
    return new Response(JSON.stringify({ 
      message: data.choices[0].message.content 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in copilot-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Tool implementations
async function getWeather(lat: number, lng: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia/Kolkata`;
    const response = await fetch(url);
    const data = await response.json();

    return {
      temperature: Math.round(data.current.temperature_2m),
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      rainfall: data.current.precipitation,
      condition: mapWeatherCode(data.current.weather_code),
      forecast: data.daily.time.slice(0, 3).map((date: string, i: number) => ({
        date,
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        rainfall: data.daily.precipitation_sum[i]
      }))
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return { error: 'Unable to fetch weather data' };
  }
}

async function getRisk(lat: number, lng: number) {
  try {
    // Fetch recent earthquakes
    const earthquakeUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson';
    const response = await fetch(earthquakeUrl);
    const data = await response.json();

    // Check for nearby disasters (within 500km)
    const nearbyEvents = data.features.filter((feature: any) => {
      const [eLng, eLat] = feature.geometry.coordinates;
      const distance = calculateDistance(lat, lng, eLat, eLng);
      return distance < 500;
    });

    let riskLevel = 'low';
    let factors = [];

    if (nearbyEvents.length > 0) {
      riskLevel = 'high';
      factors.push(`${nearbyEvents.length} recent earthquake(s) detected nearby`);
    }

    // Check monsoon season (June-September)
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 9) {
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      factors.push('Monsoon season - increased flood risk');
    }

    return {
      riskLevel,
      factors: factors.length > 0 ? factors : ['No immediate threats detected'],
      nearbyEvents: nearbyEvents.length
    };
  } catch (error) {
    console.error('Risk assessment error:', error);
    return { error: 'Unable to assess risk' };
  }
}

async function getNearby(lat: number, lng: number, radius: number) {
  try {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        node["amenity"="police"](around:${radius},${lat},${lng});
        node["amenity"="fire_station"](around:${radius},${lat},${lng});
        node["emergency"="assembly_point"](around:${radius},${lat},${lng});
        node["amenity"="shelter"](around:${radius},${lat},${lng});
      );
      out body;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });

    const data = await response.json();
    
    const facilities = data.elements.map((element: any) => {
      const type = element.tags.amenity === 'hospital' ? 'hospital' 
                 : element.tags.amenity === 'police' ? 'police'
                 : element.tags.amenity === 'fire_station' ? 'fire_station'
                 : element.tags.emergency === 'assembly_point' ? 'shelter'
                 : 'shelter';

      return {
        name: element.tags.name || `${type} facility`,
        type,
        distance: Math.round(calculateDistance(lat, lng, element.lat, element.lon) * 1000),
        contact: element.tags.phone || element.tags.contact
      };
    });

    return {
      count: facilities.length,
      facilities: facilities.slice(0, 10).sort((a: any, b: any) => a.distance - b.distance)
    };
  } catch (error) {
    console.error('Nearby facilities error:', error);
    return { error: 'Unable to fetch nearby facilities' };
  }
}

async function getAlerts() {
  try {
    const response = await fetch(
      'https://api.reliefweb.int/v1/disasters?appname=apidoc&filter[field]=country.iso3&filter[value]=IND&filter[field]=status&filter[value]=current&limit=5'
    );
    const data = await response.json();

    const alerts = data.data.map((item: any) => ({
      title: item.fields.name,
      type: item.fields.type?.[0]?.name || 'Unknown',
      status: item.fields.status,
      date: item.fields.date?.created
    }));

    return {
      count: alerts.length,
      alerts: alerts.length > 0 ? alerts : [{ message: 'No active alerts at this time' }]
    };
  } catch (error) {
    console.error('Alerts API error:', error);
    return { error: 'Unable to fetch alerts' };
  }
}

// Helper functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function mapWeatherCode(code: number): string {
  const weatherCodes: { [key: number]: string } = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Moderate snow', 75: 'Heavy snow', 80: 'Light rain showers',
    81: 'Moderate rain showers', 82: 'Violent rain showers', 95: 'Thunderstorm',
    96: 'Thunderstorm with light hail', 99: 'Thunderstorm with heavy hail'
  };
  return weatherCodes[code] || 'Unknown';
}
