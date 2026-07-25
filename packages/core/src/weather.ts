/**
 * Weather forecast for a job's service location/date, via Open-Meteo
 * (free, no API key required). Forecasts are only available for roughly the
 * next 16 days — callers should treat a null return as "not available yet"
 * rather than an error.
 */
const WEATHER_CODE_MAP: Record<number, { label: string; emoji: string }> = {
  0: { label: "Clear sky", emoji: "☀️" },
  1: { label: "Mainly clear", emoji: "🌤️" },
  2: { label: "Partly cloudy", emoji: "⛅" },
  3: { label: "Overcast", emoji: "☁️" },
  45: { label: "Foggy", emoji: "🌫️" },
  48: { label: "Foggy", emoji: "🌫️" },
  51: { label: "Light drizzle", emoji: "🌦️" },
  53: { label: "Drizzle", emoji: "🌦️" },
  55: { label: "Heavy drizzle", emoji: "🌧️" },
  61: { label: "Light rain", emoji: "🌦️" },
  63: { label: "Rain", emoji: "🌧️" },
  65: { label: "Heavy rain", emoji: "🌧️" },
  71: { label: "Light snow", emoji: "🌨️" },
  73: { label: "Snow", emoji: "🌨️" },
  75: { label: "Heavy snow", emoji: "❄️" },
  80: { label: "Rain showers", emoji: "🌦️" },
  81: { label: "Rain showers", emoji: "🌧️" },
  82: { label: "Heavy showers", emoji: "⛈️" },
  95: { label: "Thunderstorm", emoji: "⛈️" },
  96: { label: "Thunderstorm", emoji: "⛈️" },
  99: { label: "Thunderstorm", emoji: "⛈️" },
};

export interface WeatherForecast {
  date: string;
  label: string;
  emoji: string;
  tempMinC: number;
  tempMaxC: number;
  precipitationChancePct: number;
}

export async function getWeatherForecast(lat: number, lng: number, date: string): Promise<WeatherForecast | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${date}&end_date=${date}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const code = data.daily?.weathercode?.[0];
  const tempMax = data.daily?.temperature_2m_max?.[0];
  const tempMin = data.daily?.temperature_2m_min?.[0];
  if (code === undefined || tempMax === undefined || tempMin === undefined) return null;
  const info = WEATHER_CODE_MAP[code] ?? { label: "Forecast unavailable", emoji: "🌡️" };
  return {
    date,
    label: info.label,
    emoji: info.emoji,
    tempMinC: Math.round(tempMin),
    tempMaxC: Math.round(tempMax),
    precipitationChancePct: Math.round(data.daily?.precipitation_probability_max?.[0] ?? 0),
  };
}
