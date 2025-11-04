import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, MapPin, Bell, BellOff, RefreshCw } from "lucide-react";

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;
const HAS_OPENWEATHER = Boolean(OPENWEATHER_API_KEY);

type WeatherData = {
  tempC: number;
  humidity: number;
  wind: number; // m/s
  rain1h: number; // mm
  description: string;
};

const crops = [
  { value: "tomato", label: "Tomato" },
  { value: "wheat", label: "Wheat" },
  { value: "rice", label: "Rice" },
  { value: "cotton", label: "Cotton" },
];

function computeRisk(crop: string, w: WeatherData | null) {
  if (!w) return { level: "Low", reasons: [] as string[] };
  const reasons: string[] = [];
  let score = 0;
  const { tempC: temp, humidity: hum, wind, rain1h: rain } = w;
  switch (crop) {
    case "tomato":
      if (hum > 85 && temp >= 12 && temp <= 25 && rain > 0) { score += 3; reasons.push("High humidity + rain in 12–25°C → blight risk"); }
      else if (hum > 75 && rain > 0) { score += 2; reasons.push("Humid with rain → fungal risk"); }
      if (temp > 35) { score += 1; reasons.push("Heat stress possible"); }
      break;
    case "rice":
      if (rain >= 10) { score += 3; reasons.push("Heavy rain → disease/lodging risk"); }
      if (hum > 85 && temp >= 20 && temp <= 30) { score += 2; reasons.push("Warm and very humid → blast risk"); }
      if (wind > 12) { score += 1; reasons.push("Strong wind → lodging risk"); }
      break;
    case "wheat":
      if (temp >= 5 && temp <= 15 && hum > 70) { score += 2; reasons.push("Cool and humid → rust risk"); }
      if (rain > 0) { score += 1; reasons.push("Leaf wetness → fungal risk"); }
      break;
    case "cotton":
      if (temp > 35 && hum < 30) { score += 2; reasons.push("Hot and dry → heat stress"); }
      if (wind > 10) { score += 1; reasons.push("Windy → pest/dust stress"); }
      if (rain >= 10) { score += 1; reasons.push("Heavy rain → waterlogging risk"); }
      break;
  }
  const level = score >= 3 ? "High" : score === 2 ? "Moderate" : "Low";
  return { level, reasons };
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
    };
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load weather (Open-Meteo)");
  const json = await res.json();
  return {
    tempC: json.current?.temperature_2m ?? 0,
    humidity: json.current?.relative_humidity_2m ?? 0,
    wind: (json.current?.wind_speed_10m ?? 0) / 3.6,
    rain1h: json.current?.precipitation ?? 0,
    description: "",
  };
}

export default function SmartAlerts() {
  const [enabled, setEnabled] = useState(false);
  const [weatherOn, setWeatherOn] = useState(true);
  const [diseaseOn, setDiseaseOn] = useState(true);
  const [treatmentOn, setTreatmentOn] = useState(true);
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastWeather, setLastWeather] = useState<WeatherData | null>(null);
  const [crop, setCrop] = useState<string>(crops[0].value);

  const timerRef = useRef<number | null>(null);

  const risk = useMemo(() => (diseaseOn ? computeRisk(crop, lastWeather) : null), [crop, diseaseOn, lastWeather]);

  const requestPermission = async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const res = await Notification.requestPermission();
    return res === "granted";
  };

  const notify = (title: string, body: string) => {
    if (("Notification" in window) && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };

  const useMyLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLoading(false); },
      () => { setLoading(false); }
    );
  };

  const useCity = async () => {
    if (!city.trim()) return;
    setLoading(true);
    try {
      const c = await geocodeCityOpenMeteo(city.trim());
      setCoords(c);
    } finally { setLoading(false); }
  };

  const poll = async () => {
    if (!coords) return;
    try {
      const w = await fetchWeather(coords.lat, coords.lon);
      // Weather change alert
      if (weatherOn && lastWeather) {
        if (w.rain1h > 0 && (lastWeather.rain1h ?? 0) === 0) notify("Rain Alert", "Rain started in your area. Consider protective measures.");
        if (Math.abs(w.tempC - lastWeather.tempC) >= 5) notify("Temperature Change", `Temp changed to ${w.tempC.toFixed(0)}°C`);
      }
      setLastWeather(w);
      // Disease risk alert
      if (diseaseOn) {
        const r = computeRisk(crop, w);
        if (r.level === "High") notify("High Disease Risk", r.reasons[0] || "Favorable conditions for disease");
      }
      // Treatment reminders (simple placeholder)
      if (treatmentOn) {
        // Example: if humid and warm, suggest preventive spray
        if (w.humidity > 80 && w.rain1h === 0) notify("Preventive Advice", "High humidity: consider preventive fungicide as per label.");
      }
    } catch { /* ignore single poll errors */ }
  };

  const start = async () => {
    const ok = await requestPermission();
    if (!ok) return;
    setEnabled(true);
    await poll();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(poll, 10 * 60 * 1000); // every 10 min
  };

  const stop = () => {
    setEnabled(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  return (
    <main className="min-h-screen py-10">
      <div className="container mx-auto px-4">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Smart Alerts</CardTitle>
            <CardDescription>Timely notifications for weather changes, disease risks, and treatment tips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex gap-2">
                <Input placeholder="Enter city (e.g., Pune)" value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && useCity()} />
                <Button variant="secondary" onClick={useCity} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set City"}</Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={useMyLocation} variant="outline" disabled={loading}><MapPin className="mr-2 h-4 w-4" />Use My Location</Button>
                <Button onClick={poll} variant="outline" disabled={!coords || loading}><RefreshCw className="mr-2 h-4 w-4" />Test Now</Button>
              </div>
              <div className="flex gap-2">
                {enabled ? (
                  <Button onClick={stop} variant="destructive"><BellOff className="mr-2 h-4 w-4" />Stop Alerts</Button>
                ) : (
                  <Button onClick={start}><Bell className="mr-2 h-4 w-4" />Enable Alerts</Button>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium">Weather Alerts</div>
                <div className="text-muted-foreground">Rain start and temperature swings</div>
                <Badge variant={weatherOn ? "default" : "secondary"}>{weatherOn ? "On" : "Off"}</Badge>
              </div>
              <div className="space-y-2">
                <div className="font-medium">Disease Risk Alerts</div>
                <div className="text-muted-foreground">Based on current weather for your crop</div>
                <Badge variant={diseaseOn ? "default" : "secondary"}>{diseaseOn ? "On" : "Off"}</Badge>
              </div>
              <div className="space-y-2">
                <div className="font-medium">Treatment Tips</div>
                <div className="text-muted-foreground">Simple preventive/reminder suggestions</div>
                <Badge variant={treatmentOn ? "default" : "secondary"}>{treatmentOn ? "On" : "Off"}</Badge>
              </div>
            </div>

            {lastWeather && (
              <div className="rounded-md border p-4 text-sm">
                Last check: {lastWeather.tempC.toFixed(0)}°C, Humidity {lastWeather.humidity}% , Rain(1h) {lastWeather.rain1h} mm
              </div>
            )}

            <div className="text-xs text-muted-foreground">Notifications require HTTPS or localhost and browser permission.</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
