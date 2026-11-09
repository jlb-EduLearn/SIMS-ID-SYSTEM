type WeatherCacheEntry = { at: number; data: BoardWeatherSnapshot };
const cache = new Map<string, WeatherCacheEntry>();
const CACHE_MS = 12 * 60 * 1000;

export type BoardWeatherSnapshot = {
  locationLabel: string;
  temperatureC: number;
  humidity: number;
  description: string;
  icon: "clear" | "cloud" | "rain" | "storm" | "fog";
};

function weatherCodeToMeta(code: number): {
  description: string;
  icon: BoardWeatherSnapshot["icon"];
} {
  if (code === 0) return { description: "Clear", icon: "clear" };
  if (code <= 3) return { description: "Partly cloudy", icon: "cloud" };
  if (code <= 48) return { description: "Foggy", icon: "fog" };
  if (code <= 67) return { description: "Rain", icon: "rain" };
  if (code <= 82) return { description: "Showers", icon: "rain" };
  if (code <= 99) return { description: "Thunderstorm", icon: "storm" };
  return { description: "Cloudy", icon: "cloud" };
}

async function geocode(query: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query.trim());
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{
      name: string;
      admin1?: string;
      country?: string;
      latitude: number;
      longitude: number;
    }>;
  };
  const hit = data.results?.[0];
  if (!hit) return null;
  const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
  return { lat: hit.latitude, lon: hit.longitude, label };
}

export async function fetchBoardWeather(
  locationQuery: string
): Promise<BoardWeatherSnapshot | null> {
  const key = locationQuery.trim().toLowerCase() || "cebu";
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  const geo = await geocode(locationQuery.trim() || "Cebu, Philippines");
  if (!geo) return null;

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(geo.lat));
  forecastUrl.searchParams.set("longitude", String(geo.lon));
  forecastUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code");
  forecastUrl.searchParams.set("timezone", "auto");

  const res = await fetch(forecastUrl.toString(), { next: { revalidate: 600 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
    };
  };
  const current = data.current;
  if (!current || current.temperature_2m == null) return null;

  const meta = weatherCodeToMeta(current.weather_code ?? 0);
  const snapshot: BoardWeatherSnapshot = {
    locationLabel: geo.label,
    temperatureC: Math.round(current.temperature_2m),
    humidity: Math.round(current.relative_humidity_2m ?? 0),
    description: meta.description,
    icon: meta.icon,
  };
  cache.set(key, { at: Date.now(), data: snapshot });
  return snapshot;
}
