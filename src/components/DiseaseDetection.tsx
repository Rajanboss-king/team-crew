import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, Camera } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const DiseaseDetection = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [spray, setSpray] = useState<any>(null);
  const [showCameraOption, setShowCameraOption] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const RAW_BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5000";
  const BACKEND_URL = (() => {
    let u = String(RAW_BACKEND_URL || "").trim();
    // Fix common typo: http://localhost5000 -> http://localhost:5000
    const m = u.match(/^https?:\/\/localhost(\d{2,5})(?:\/?|$)/i);
    if (m) u = u.replace("localhost" + m[1], `localhost:${m[1]}`);
    // Remove trailing slash
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
  })();
  const [cropType, setCropType] = useState<string>("Tomato");
  const [soilMoisture, setSoilMoisture] = useState<string>("45");
  const [city, setCity] = useState<string>("Patna");

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      toast({ title: "Unable to open camera", description: e?.message || "Permission denied or unsupported.", variant: "destructive" as any });
      setCameraOpen(false);
    }
  };

  const stopCamera = () => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSelectedImage(dataUrl);
    setResult(null);
    setCameraOpen(false);
  };

  const openCamera = () => {
    setCameraOpen(true);
  };

  useEffect(() => {
    const onScroll = () => {
      setShowCameraOption(window.scrollY > 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (cameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen]);

  const analyzeImage = async () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    try {
      // 1) Quick backend health check with timeout
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 4000);
        const h = await fetch(`${BACKEND_URL}/health`, { signal: ac.signal });
        clearTimeout(t);
        if (!h.ok) throw new Error(`Backend health ${h.status}`);
      } catch (e: any) {
        throw new Error(`Backend not reachable at ${BACKEND_URL}. Set VITE_BACKEND_URL and start backend.`);
      }

      // Convert data URL to Blob (safer than fetch(dataURL) on some browsers)
      const dataURLToBlob = (dataUrl: string) => {
        const arr = dataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new Blob([u8arr], { type: mime });
      };
      const blob = dataURLToBlob(selectedImage);
      const fd = new FormData();
      fd.append("file", new File([blob], "crop.jpg", { type: blob.type || "image/jpeg" }));
      const predRes = await fetch(`${BACKEND_URL}/predict`, { method: "POST", body: fd });
      if (!predRes.ok) {
        const tx = await predRes.text().catch(() => "");
        throw new Error(`Prediction failed: ${predRes.status} ${tx}`);
      }
      const pred = await predRes.json();
      const diseaseName = pred.disease || pred.label || "Unknown";
      setResult({ disease: diseaseName, confidence: Math.round((pred.confidence || 0.85) * 100) });

      const sprayRes = await fetch(`${BACKEND_URL}/smart-spray`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop_type: cropType,
          disease_name: diseaseName,
          soil_moisture: parseFloat(soilMoisture || "0"),
          city,
        })
      });
      if (!sprayRes.ok) {
        const errText = await sprayRes.text().catch(() => "");
        // Do not abort overall flow; show disease result even if smart-spray fails
        toast({ title: "Smart Spray unavailable", description: `(${sprayRes.status}) ${errText}`, variant: "destructive" as any });
      } else {
        const sprayJson = await sprayRes.json();
        setSpray(sprayJson);
      }
      toast({ title: "Analysis Complete!", description: `${diseaseName} detected` });
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : JSON.stringify(e);
      toast({ title: "Analysis failed", description: msg || "Try again later", variant: "destructive" as any });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            AI-Powered
            <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Disease Detection
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Upload a photo of your crop and get instant analysis
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Upload Crop Image</CardTitle>
              <CardDescription>
                Take a clear photo of the affected crop area for best results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hidden file input remains for manual upload area only */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  {selectedImage ? (
                    <img src={selectedImage} alt="Uploaded crop" className="max-h-64 mx-auto rounded-lg shadow-md" />
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">Click to upload image</p>
                        <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              {selectedImage && !result && (
                <Button 
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Crop"
                  )}
                </Button>
              )}
              {selectedImage && !result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input placeholder="Crop type" value={cropType} onChange={(e) => setCropType(e.target.value)} />
                  <Input placeholder="Soil moisture (%)" type="number" value={soilMoisture} onChange={(e) => setSoilMoisture(e.target.value)} />
                  <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
              )}

              {result && (
                <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                      <CardTitle className="text-xl">Detection Results</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Disease</p>
                        <p className="text-lg font-semibold text-destructive">{result.disease}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="text-lg font-semibold text-primary">{result.confidence}%</p>
                      </div>
                    </div>
                    {spray && (
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-semibold text-foreground">Smart Spray Recommendation</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div><span className="font-medium">Pesticide:</span> {spray.recommended_pesticide}</div>
                          <div><span className="font-medium">Quantity:</span> {spray.quantity}</div>
                          <div><span className="font-medium">Best time:</span> {spray.best_time}</div>
                          <div className="md:col-span-2"><span className="font-medium">Reason:</span> {spray.reason}</div>
                          <div className="md:col-span-2"><span className="font-medium">Precautions:</span> {spray.precautions}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
        {showCameraOption && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button onClick={openCamera} size="lg" className="shadow-lg">
              <Camera className="mr-2 h-5 w-5" />
              Open Camera
            </Button>
          </div>
        )}
        <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Capture Crop Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-md overflow-hidden">
                <video ref={videoRef} playsInline className="w-full h-full object-contain" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={capturePhoto}>Capture</Button>
                <Button className="flex-1" variant="outline" onClick={() => setCameraOpen(false)}>Close</Button>
              </div>
              <p className="text-xs text-muted-foreground">Rear camera preferred when available.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default DiseaseDetection;
