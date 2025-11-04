import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, FlaskConical, Droplets, Leaf, Recycle } from "lucide-react";

type SoilResult = {
  soilType: "Sandy" | "Loamy" | "Clay" | "Peaty" | "Silty" | "Unknown";
  score: number; // confidence 0..1
  nutrients: { N: number; P: number; K: number; Organic: number; Moisture: number };
  missing: string[];
};

function analyzeSoilFromImage(dataUrl: string): Promise<SoilResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSide = 512;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.floor(img.width * scale));
      canvas.height = Math.max(1, Math.floor(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ soilType: "Unknown", score: 0.2, nutrients: { N: 40, P: 40, K: 40, Organic: 40, Moisture: 40 }, missing: ["Capture clearer soil close-up"] });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let sumR = 0, sumG = 0, sumB = 0, sumBrightness = 0, pixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // Skip highly saturated greens/blues (vegetation artifacts)
        if (g > r * 1.2 && g > 80) continue;
        sumR += r; sumG += g; sumB += b; pixels++;
        sumBrightness += (r + g + b) / 3;
      }
      if (!pixels) pixels = 1;
      const avgR = sumR / pixels, avgG = sumG / pixels, avgB = sumB / pixels;
      const brightness = sumBrightness / pixels; // 0..255
      const redness = avgR - (avgG + avgB) / 2; // red dominance
      const yellowness = avgG - avgB / 2; // crude proxy
      const brownness = (avgR + avgG) / 2 - avgB; // brown dominance

      // Soil type heuristic
      let soilType: SoilResult["soilType"] = "Unknown";
      if (brightness > 170) soilType = "Sandy"; // very light
      else if (brownness > 40 && brightness > 90) soilType = "Loamy";
      else if (avgB < 70 && redness > 20 && brightness < 120) soilType = "Clay";
      else if (avgB < 80 && brightness < 90) soilType = "Peaty";
      else if (brightness > 120 && yellowness > 20) soilType = "Silty";
      const score = Math.min(1, Math.max(0.3, Math.abs(brownness) / 100 + Math.abs(redness) / 120));

      // Simple nutrient proxies: purely heuristic for demo
      const moisture = Math.min(100, Math.max(5, 140 - brightness));
      const organic = Math.min(100, Math.max(10, 20 + brownness));
      const N = Math.min(100, Math.max(10, 30 + organic * 0.5 - (soilType === "Sandy" ? 10 : 0)));
      const P = Math.min(100, Math.max(10, 35 + (soilType === "Clay" ? 10 : 0) + (yellowness * 0.3)));
      const K = Math.min(100, Math.max(10, 40 + (soilType === "Loamy" ? 10 : 0)));

      const nutrients = { N: Math.round(N), P: Math.round(P), K: Math.round(K), Organic: Math.round(organic), Moisture: Math.round(moisture) };
      const missing: string[] = [];
      if (nutrients.N < 50) missing.push("Nitrogen (N)");
      if (nutrients.P < 50) missing.push("Phosphorus (P)");
      if (nutrients.K < 50) missing.push("Potassium (K)");
      if (nutrients.Organic < 40) missing.push("Organic matter");
      if (nutrients.Moisture < 30) missing.push("Moisture");

      resolve({ soilType, score, nutrients, missing });
    };
    img.src = dataUrl;
  });
}

export default function SoilScan() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<SoilResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraOpen(false);
    }
  };
  const stopCamera = () => {
    const s = streamRef.current; if (s) s.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current = null;
  };
  useEffect(() => { if (cameraOpen) startCamera(); else stopCamera(); return () => stopCamera(); }, [cameraOpen]);

  const capture = async () => {
    const video = videoRef.current; if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCameraOpen(false);
    setPhoto(dataUrl);
    setAnalyzing(true);
    const r = await analyzeSoilFromImage(dataUrl);
    setResult(r);
    setAnalyzing(false);
  };

  const Bar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 bg-muted rounded">
        <div className="h-2 rounded" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );

  return (
    <main className="min-h-screen py-10">
      <div className="container mx-auto px-4">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FlaskConical className="w-6 h-6 text-primary" /> Soil Scanner</CardTitle>
            <CardDescription>Scan soil via camera to estimate type and nutrient status (demo heuristic)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Button onClick={() => { setResult(null); setPhoto(null); setCameraOpen(true); }}>
                <Camera className="w-4 h-4 mr-2" /> Start Analysis
              </Button>
            </div>

            {photo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img src={photo} alt="Soil" className="w-full rounded-md border" />
                </div>
                <div className="space-y-4">
                  {analyzing && (
                    <div className="text-sm text-muted-foreground">Analyzing soil image...</div>
                  )}
                  {result && (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge>{result.soilType}</Badge>
                        <span className="text-sm text-muted-foreground">Confidence {(result.score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <Bar label="Nitrogen (N)" value={result.nutrients.N} color="#22c55e" />
                        <Bar label="Phosphorus (P)" value={result.nutrients.P} color="#eab308" />
                        <Bar label="Potassium (K)" value={result.nutrients.K} color="#3b82f6" />
                        <Bar label="Organic" value={result.nutrients.Organic} color="#8b5cf6" />
                        <Bar label="Moisture" value={result.nutrients.Moisture} color="#06b6d4" />
                      </div>
                      {result.missing.length > 0 && (
                        <div className="text-sm">
                          Missing/Low: {result.missing.join(", ")}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Scan Soil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-md overflow-hidden">
              <video ref={videoRef} playsInline className="w-full h-full object-contain" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={capture}>Capture</Button>
              <Button className="flex-1" variant="outline" onClick={() => setCameraOpen(false)}>Close</Button>
            </div>
            <p className="text-xs text-muted-foreground">Ensure frame is filled with soil surface for better results.</p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
