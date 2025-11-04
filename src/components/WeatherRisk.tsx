import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, MapPin, RefreshCw } from "lucide-react";

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;
const HAS_OPENWEATHER = Boolean(OPENWEATHER_API_KEY);

type WeatherData = {
  tempC: number;
  humidity: number;
  wind: number; // m/s
  rain1h: number; // mm
  description: string;
  icon: string;
};

const crops = [
  { value: "tomato", label: "Tomato" },
  { value: "wheat", label: "Wheat" },
  { value: "rice", label: "Rice" },
  { value: "cotton", label: "Cotton" },
];

type Risk = {
  level: "Low" | "Moderate" | "High";
  reasons: string[];
};

function computeRisk(crop: string, w: WeatherData | null): Risk | null {
  if (!w) return null;
  const reasons: string[] = [];
  let score = 0;

  const temp = w.tempC;
  const hum = w.humidity;
  const wind = w.wind;
  const rain = w.rain1h;

  switch (crop) {
    case "tomato": {
      if (hum > 85 && temp >= 12 && temp <= 25 && rain > 0) {
        score += 3; reasons.push("High humidity + rain in 12–25°C → blight risk");
      } else if (hum > 75 && rain > 0) {
        score += 2; reasons.push("Humid with rain → fungal risk");
      }
      if (temp > 35) { score += 1; reasons.push("Heat stress possible"); }
      break;
    }
    case "rice": {
      if (rain >= 10) { score += 3; reasons.push("Heavy rain → disease/lodging risk"); }
      if (hum > 85 && temp >= 20 && temp <= 30) { score += 2; reasons.push("Warm and very humid → blast risk"); }
      if (wind > 12) { score += 1; reasons.push("Strong wind → lodging risk"); }
      break;
    }
    case "wheat": {
      if (temp >= 5 && temp <= 15 && hum > 70) { score += 2; reasons.push("Cool and humid → rust risk"); }
      if (rain > 0) { score += 1; reasons.push("Leaf wetness → fungal risk"); }
      break;
    }
    case "cotton": {
      if (temp > 35 && hum < 30) { score += 2; reasons.push("Hot and dry → heat stress"); }
      if (wind > 10) { score += 1; reasons.push("Windy → pest/dust stress"); }
      if (rain >= 10) { score += 1; reasons.push("Heavy rain → waterlogging risk"); }
      break;
    }
  }

  const level = score >= 3 ? "High" : score === 2 ? "Moderate" : "Low";
  return { level, reasons };
}

async function geocodeCity(city: string) {
  if (!OPENWEATHER_API_KEY) throw new Error("Missing VITE_OPENWEATHER_API_KEY");
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to geocode city");
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("City not found");
  const { lat, lon } = data[0];
  return { lat, lon } as { lat: number; lon: number };
}

async function geocodeCityOpenMeteo(city: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to geocode city (Open-Meteo)");
  const data = await res.json();
  if (!data?.results?.length) throw new Error("City not found");
  const { latitude: lat, longitude: lon } = data.results[0];
  return { lat, lon } as { lat: number; lon: number };
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  if (HAS_OPENWEATHER) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load weather");
    const json = await res.json();
    return {
      tempC: json.main?.temp ?? 0,
      humidity: json.main?.humidity ?? 0,
      wind: json.wind?.speed ?? 0,
      rain1h: json.rain?.["1h"] ?? 0,
      description: json.weather?.[0]?.description ?? "",
      icon: json.weather?.[0]?.icon ?? "",
    } as WeatherData;
  }
  // Open-Meteo fallback (no API key required)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load weather (Open-Meteo)");
  const json = await res.json();
  const wmo = json.current?.weather_code as number | undefined;
  const description = wmoToText(wmo);
  return {
    tempC: json.current?.temperature_2m ?? 0,
    humidity: json.current?.relative_humidity_2m ?? 0,
    wind: (json.current?.wind_speed_10m ?? 0) / 3.6, // km/h -> m/s if needed; Open-Meteo default is km/h
    rain1h: json.current?.precipitation ?? 0,
    description,
    icon: "",
  } as WeatherData;
}

async function fetchWeatherByCity(city: string): Promise<WeatherData> {
  if (HAS_OPENWEATHER) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load weather for city");
    const json = await res.json();
    return {
      tempC: json.main?.temp ?? 0,
      humidity: json.main?.humidity ?? 0,
      wind: json.wind?.speed ?? 0,
      rain1h: json.rain?.["1h"] ?? 0,
      description: json.weather?.[0]?.description ?? "",
      icon: json.weather?.[0]?.icon ?? "",
    } as WeatherData;
  }
  // Open-Meteo fallback via geocoding
  const { lat, lon } = await geocodeCityOpenMeteo(city);
  return fetchWeather(lat, lon);
}

function wmoToText(code?: number): string {
  if (code == null) return "";
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with hail",
  };
  return map[code] ?? "Weather";
}

export default function WeatherRisk() {
  const [crop, setCrop] = useState<string>(crops[0].value);
  const [city, setCity] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  const risk = useMemo(() => computeRisk(crop, weather), [crop, weather]);

  const loadWeather = async (src: { lat: number; lon: number }) => {
    setLoading(true);
    setError(null);
    try {
      const w = await fetchWeather(src.lat, src.lon);
      setWeather(w);
      setCoords(src);
    } catch (e: any) {
      setError(e?.message || "Failed to load weather");
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        setLoading(false);
        setError(err.message || "Failed to get location");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const searchCity = async () => {
    if (!city.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const w = await fetchWeatherByCity(city.trim());
      setWeather(w);
      setCoords(null);
    } catch (e: any) {
      setError(e?.message || "City search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!coords) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      loadWeather(coords);
    }, 10 * 60 * 1000); // every 10 minutes
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [coords?.lat, coords?.lon]);

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Weather Risk Prediction</CardTitle>
            <CardDescription>
              Real-time weather monitoring with crop-specific risk alerts
              {!HAS_OPENWEATHER && (
                <>
                  <br />Using free Open-Meteo (no API key required). You can also set VITE_OPENWEATHER_API_KEY to use OpenWeather.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* No blocking notice; Open-Meteo fallback works without API key */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Select value={crop} onValueChange={setCrop}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Crop" />
                  </SelectTrigger>
                  <SelectContent>
                    {crops.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter city (e.g., Pune)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchCity()}
                />
                <Button variant="secondary" onClick={searchCity} disabled={loading}>Search</Button>
              </div>
              <div className="flex gap-2 justify-start md:justify-end">
                <Button onClick={useMyLocation} variant="outline" disabled={loading}>
                  <MapPin className="mr-2 h-4 w-4" /> Use My Location
                </Button>
                <Button onClick={() => coords && loadWeather(coords)} variant="outline" disabled={loading || !coords}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg p-4 border bg-card">
                <div className="flex items-center gap-3">
                  {weather?.icon && (
                    <img alt="icon" src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} className="h-12 w-12" />
                  )}
                  <div>
                    <div className="text-xl font-semibold">{weather ? `${weather.tempC.toFixed(0)}°C, ${weather.description}` : "No data"}</div>
                    {coords && <div className="text-xs text-muted-foreground">lat {coords.lat.toFixed(3)}, lon {coords.lon.toFixed(3)}</div>}
                  </div>
                </div>
                {weather && (
                  <div className="mt-3 grid grid-cols-3 text-sm">
                    <div>Humidity: <span className="font-medium">{weather.humidity}%</span></div>
                    <div>Wind: <span className="font-medium">{weather.wind.toFixed(1)} m/s</span></div>
                    <div>Rain(1h): <span className="font-medium">{weather.rain1h} mm</span></div>
                  </div>
                )}
                {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
              </div>

              <div className="rounded-lg p-4 border bg-card">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">Risk for {crops.find(c => c.value === crop)?.label}</div>
                  {risk && (
                    <Badge variant={risk.level === "High" ? "destructive" : risk.level === "Moderate" ? "secondary" : "default"}>
                      {risk.level}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {risk?.reasons?.length ? (
                    risk.reasons.map((r, i) => (
                      <div key={i} className="text-sm">• {r}</div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No significant weather risks detected</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
