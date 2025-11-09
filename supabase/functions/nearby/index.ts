import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, types } = await req.json();

    if (!lat || !lng) {
      throw new Error('Latitude and longitude are required');
    }

    console.log(`Fetching services near ${lat}, ${lng} for types: ${types}`);

    // Parse types filter
    const typesList = types ? types.split(',') : ['hospital', 'police', 'fire_station'];
    const radius = 10000; // 10km radius

    // Build Overpass API query
    const amenityFilters = typesList.map((type: string) => {
      if (type === 'hospital') return `node["amenity"="hospital"](around:${radius},${lat},${lng});`;
      if (type === 'police') return `node["amenity"="police"](around:${radius},${lat},${lng});`;
      if (type === 'fire_station') return `node["amenity"="fire_station"](around:${radius},${lat},${lng});`;
      return '';
    }).filter(Boolean).join('\n        ');

    const query = `
      [out:json][timeout:25];
      (
        ${amenityFilters}
      );
      out body;
    `;

    console.log('Overpass query:', query);

    // Fetch from Overpass API
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.elements.length} services`);

    // Transform and calculate distances
    const services = data.elements.map((element: any) => {
      let serviceType = 'other';
      if (element.tags.amenity === 'hospital') serviceType = 'hospital';
      else if (element.tags.amenity === 'police') serviceType = 'police';
      else if (element.tags.amenity === 'fire_station') serviceType = 'fire_station';

      const distance = calculateDistance(lat, lng, element.lat, element.lon);

      return {
        id: element.id.toString(),
        name: element.tags.name || `${serviceType} facility`,
        type: serviceType,
        lat: element.lat,
        lng: element.lon,
        distance: parseFloat(distance.toFixed(2)),
        address: element.tags['addr:full'] || element.tags['addr:street'] || undefined,
        phone: element.tags.phone || element.tags['contact:phone'] || undefined,
      };
    });

    // Sort by distance
    services.sort((a: any, b: any) => a.distance - b.distance);

    console.log(`Returning ${services.length} services`);

    return new Response(
      JSON.stringify({ services }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in nearby function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}
