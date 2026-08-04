function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Deterministic small offset (100-400m) so a location can be shown on a map
 * (e.g. an unpurchased lead's approximate position) without ever exposing
 * the true point — a provider dashboard "radar" pin, not a real address.
 * Deterministic per `seed` so the same lead's pin stays stable across polls
 * instead of visibly jumping around.
 */
export function jitterLocation(lat: number, lng: number, seed: string): { lat: number; lng: number } {
  const angle = (hashSeed(`${seed}:angle`) % 360) * (Math.PI / 180);
  const distanceMeters = 100 + (hashSeed(`${seed}:dist`) % 300);
  const latOffset = (distanceMeters * Math.cos(angle)) / 111_320;
  const lngOffset = (distanceMeters * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + latOffset, lng: lng + lngOffset };
}

/** Haversine distance in miles between two lat/lng points. */
export function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Server-side geocode via Google Maps Geocoding API. */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY not configured");
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=gb&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.[0]) return null;
  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng, formattedAddress: data.results[0].formatted_address };
}

export interface ResolvedAddress {
  addressLine: string;
  city: string;
  postcode?: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface GoogleAddressComponent {
  long_name: string;
  types: string[];
}

interface GoogleGeocodeResult {
  formatted_address: string;
  address_components?: GoogleAddressComponent[];
  geometry: { location: { lat: number; lng: number } };
}

function parseGeocodeResult(result: GoogleGeocodeResult): ResolvedAddress {
  const components = result.address_components ?? [];
  const find = (type: string) => components.find((c) => c.types.includes(type))?.long_name;
  const streetNumber = find("street_number");
  const route = find("route");
  const city = find("postal_town") ?? find("locality") ?? find("administrative_area_level_2") ?? "";
  const postcode = find("postal_code");
  const addressLine = [streetNumber, route].filter(Boolean).join(" ") || result.formatted_address.split(",")[0] || result.formatted_address;
  return {
    addressLine,
    city,
    postcode,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

/** Reverse-geocode GPS coordinates ("current location") into a human-readable address. */
export async function reverseGeocode(lat: number, lng: number): Promise<ResolvedAddress | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY not configured");
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.[0]) return null;
  return parseGeocodeResult(data.results[0]);
}

export interface PlacePrediction {
  placeId: string;
  description: string;
}

/** Server-proxied Google Places Autocomplete — never exposes the API key to the browser. */
export async function placeAutocomplete(input: string): Promise<PlacePrediction[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY not configured");
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:gb&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") throw new Error(`Places autocomplete failed: ${data.status}`);
  return (data.predictions ?? []).map((p: { place_id: string; description: string }) => ({
    placeId: p.place_id,
    description: p.description,
  }));
}

/** Resolve a Places `placeId` (from placeAutocomplete) into a full address + coordinates. */
export async function placeDetails(placeId: string): Promise<ResolvedAddress | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY not configured");
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,address_component,geometry&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" || !data.result) return null;
  return parseGeocodeResult(data.result);
}

/** A cheap bounding-box pre-filter to use in SQL before precise haversine filtering in app code. */
export function boundingBox(lat: number, lng: number, radiusMiles: number) {
  const latDelta = radiusMiles / 69; // ~69 miles per degree latitude
  const lngDelta = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat - latDelta, maxLat: lat + latDelta, minLng: lng - lngDelta, maxLng: lng + lngDelta };
}
