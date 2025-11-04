import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Lightweight Leaflet loader via CDN without adding npm deps
function useLeaflet() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const hasL = (window as any).L;
    const ensure = async () => {
      if (hasL) { setReady(true); return; }
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setReady(true);
      document.body.appendChild(script);
    };
    ensure();
  }, []);
  return ready;
}

// Sample outbreak data (lat, lon, crop, disease, severity)
const SAMPLE_POINTS = [
  { lat: 19.076, lon: 72.8777, crop: "tomato", disease: "Early blight", severity: 0.7 }, // Mumbai
  { lat: 18.5204, lon: 73.8567, crop: "wheat", disease: "Rust", severity: 0.5 }, // Pune
  { lat: 28.7041, lon: 77.1025, crop: "rice", disease: "Blast", severity: 0.6 }, // Delhi
  { lat: 22.5726, lon: 88.3639, crop: "rice", disease: "Brown spot", severity: 0.4 }, // Kolkata
  { lat: 13.0827, lon: 80.2707, crop: "cotton", disease: "Bacterial blight", severity: 0.65 }, // Chennai
  { lat: 23.0225, lon: 72.5714, crop: "tomato", disease: "Late blight", severity: 0.3 }, // Ahmedabad
  { lat: 26.9124, lon: 75.7873, crop: "wheat", disease: "Powdery mildew", severity: 0.45 }, // Jaipur
];

const CROPS = [
  { value: "all", label: "All Crops" },
  { value: "tomato", label: "Tomato" },
  { value: "wheat", label: "Wheat" },
  { value: "rice", label: "Rice" },
  { value: "cotton", label: "Cotton" },
];

export default function DiseaseHeatMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const [crop, setCrop] = useState<string>("all");
  const ready = useLeaflet();
  

  const points = useMemo(() => {
    return SAMPLE_POINTS.filter(p => crop === "all" ? true : p.crop === crop);
  }, [crop]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = (window as any).L;
    if (!mapInstance.current) {
      const map = L.map(mapRef.current).setView([22.9734, 78.6569], 5); // India center
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);
      mapInstance.current = map;
    }
  }, [ready]);

  

  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    const L = (window as any).L;
    const map = mapInstance.current;

    // Clear previous layer group if any
    if ((map as any)._heatLayerGroup) {
      (map as any)._heatLayerGroup.remove();
      (map as any)._heatLayerGroup = null;
    }
    const group = L.layerGroup();

    points.forEach(p => {
      const color = p.severity > 0.6 ? "#ef4444" : p.severity > 0.45 ? "#f59e0b" : "#22c55e";
      const radius = 8 + p.severity * 12;
      const marker = L.circleMarker([p.lat, p.lon], { radius, color, fillColor: color, fillOpacity: 0.4, weight: 1 });
      marker.bindPopup(`<b>${p.crop.toUpperCase()}</b><br/>${p.disease}<br/>Severity: ${(p.severity*100).toFixed(0)}%`);
      marker.addTo(group);
    });

    group.addTo(map);
    (map as any)._heatLayerGroup = group;
  }, [points, ready]);

  return (
    <main className="min-h-screen py-10">
      <div className="container mx-auto px-4">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Disease Heat Map</CardTitle>
                <CardDescription>Visualize crop disease patterns across regions</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={crop} onValueChange={setCrop}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Crop" /></SelectTrigger>
                  <SelectContent>
                    {CROPS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="secondary">Sample Data</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex justify-center">
              <Button variant="secondary" onClick={() => setCrop('all')} className="shadow">
                Show All Crops
              </Button>
            </div>
            <div ref={mapRef} className="w-full h-[70vh] rounded-md border" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
