import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sprout, Camera, Trash2, Calculator, Loader2 } from "lucide-react";

const CROPS = [
  { value: "tomato", label: "Tomato", coeff: 1.0 },
  { value: "wheat", label: "Wheat", coeff: 0.6 },
  { value: "rice", label: "Rice", coeff: 0.7 },
  { value: "cotton", label: "Cotton", coeff: 0.8 },
];

type Photo = { dataUrl: string; greenRatio: number };

function estimateYieldPerPlant(greenRatio: number, crop: string) {
  const coeff = CROPS.find(c => c.value === crop)?.coeff ?? 1.0;
  // Simple heuristic: base 1.0 kg/plant at 20% green; scales up to ~3.0 kg/plant at 60%+
  const scaled = Math.max(0, (greenRatio - 0.15) / 0.45); // 0..1
  const perPlant = (1.0 + 2.0 * Math.min(1, scaled)) * coeff; // 1..3 kg * coeff
  return perPlant; // kg per plant
}

function analyzeGreenRatio(dataUrl: string): Promise<number> {
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
      if (!ctx) return resolve(0);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let greenish = 0; let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        // Very simple green detection: green channel dominant and saturation present
        const isGreen = g > 60 && g > r * 1.1 && g > b * 1.1;
        if (isGreen) greenish++;
        total++;
      }
      resolve(total ? greenish / total : 0);
    };
    img.src = dataUrl;
  });
}

export default function Productivity() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [crop, setCrop] = useState<string>(CROPS[0].value);
  const [plantsCount, setPlantsCount] = useState<string>("1");
  const [plantQuery, setPlantQuery] = useState<string>("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoDetailIdx, setPhotoDetailIdx] = useState<number | null>(null);
  const [showEstimate, setShowEstimate] = useState(false);
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
    setAnalyzing(true);
    const greenRatio = await analyzeGreenRatio(dataUrl);
    setPhotos(p => [...p, { dataUrl, greenRatio }]);
    setAnalyzing(false);
    setCameraOpen(false);
  };

  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));

  const avgGreen = photos.length ? photos.reduce((a, b) => a + b.greenRatio, 0) / photos.length : 0;
  const assumedGreenWhenNoPhotos = 0.4; // 40% default if user hasn't captured photos yet
  const usedGreen = photos.length ? avgGreen : assumedGreenWhenNoPhotos;
  const perPlantKg = estimateYieldPerPlant(usedGreen, crop);
  const totalKg = perPlantKg * (parseFloat(plantsCount || "0") || 0);

  const handleSearch = () => {
    const q = plantQuery.trim().toLowerCase();
    if (q) {
      const found = CROPS.find(c => c.value.toLowerCase() === q || c.label.toLowerCase().includes(q));
      if (found) setCrop(found.value);
    }
    // plantsCount already bound; calculation updates automatically
    setShowEstimate(true);
    // Scroll to the estimate box for better UX
    setTimeout(() => {
      const el = document.getElementById("prod-estimate-box");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <main className="min-h-screen py-10">
      <div className="container mx-auto px-4">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sprout className="w-6 h-6 text-primary" /> Productivity Estimator</CardTitle>
            <CardDescription>Capture plant photos and estimate potential harvest quantity (rough heuristic)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Search plant (e.g., Tomato, Wheat)" value={plantQuery} onChange={(e) => setPlantQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <div className="flex items-center gap-2">
                <Input type="number" min={1} value={plantsCount} onChange={(e) => setPlantsCount(e.target.value)} placeholder="Quantity (plants)" />
                <Button variant="secondary" onClick={handleSearch}>Search</Button>
                <Button variant="outline" onClick={() => setCameraOpen(true)}><Camera className="w-4 h-4 mr-2" />Open Camera</Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calculator className="w-4 h-4" /> Average green cover: {(avgGreen*100).toFixed(0)}%
            </div>

            {analyzing && (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Analyzing photo...
              </div>
            )}

            {(photos.length > 0 || showEstimate) && !analyzing && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {photos.map((p, i) => (
                  <div key={i} className="border rounded-md overflow-hidden cursor-pointer" onClick={() => setPhotoDetailIdx(i)}>
                    <img src={p.dataUrl} className="w-full h-32 object-cover" />
                    <div className="flex items-center justify-between px-2 py-1 text-xs">
                      <span>Green {(p.greenRatio*100).toFixed(0)}%</span>
                      <Button size="icon" variant="ghost" onClick={() => removePhoto(i)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(photos.length > 0 || showEstimate) && !analyzing && (
              <div id="prod-estimate-box" className="rounded-md border p-4">
                <div className="text-sm">Estimated yield per plant: <span className="font-semibold">{perPlantKg.toFixed(2)} kg</span></div>
                <div className="text-sm">Total estimated yield (all plants): <span className="font-semibold">{totalKg.toFixed(2)} kg</span></div>
                <div className="text-xs text-muted-foreground pt-1">
                  {photos.length > 0 ? (
                    <>Based on analyzed photos (avg green cover {(avgGreen*100).toFixed(0)}%).</>
                  ) : (
                    <>Quick estimate using default green cover {(assumedGreenWhenNoPhotos*100).toFixed(0)}%. Capture photos for higher accuracy.</>
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
            <DialogTitle>Capture Plant Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-md overflow-hidden">
              <video ref={videoRef} playsInline className="w-full h-full object-contain" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={capture}>Capture</Button>
              <Button className="flex-1" variant="outline" onClick={() => setCameraOpen(false)}>Close</Button>
            </div>
            <p className="text-xs text-muted-foreground">Rear camera preferred when available.</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={photoDetailIdx !== null} onOpenChange={(o) => !o && setPhotoDetailIdx(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Photo Analysis</DialogTitle>
          </DialogHeader>
          {photoDetailIdx !== null && (
            <div className="space-y-3">
              <img src={photos[photoDetailIdx].dataUrl} className="w-full rounded-md" />
              <div className="text-sm">Green cover: <span className="font-semibold">{(photos[photoDetailIdx].greenRatio*100).toFixed(0)}%</span></div>
              <div className="text-sm">Yield per plant (this photo): <span className="font-semibold">{estimateYieldPerPlant(photos[photoDetailIdx].greenRatio, crop).toFixed(2)} kg</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
