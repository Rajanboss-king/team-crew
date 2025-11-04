import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Volume2 } from "lucide-react";

const LANGS = [
  { code: "auto", label: "Auto" },
  { code: "en-US", label: "English" },
  { code: "hi-IN", label: "हिंदी" },
  { code: "bn-IN", label: "বাংলা" },
  { code: "ta-IN", label: "தமிழ்" },
  { code: "te-IN", label: "తెలుగు" },
  { code: "mr-IN", label: "मराठी" },
];

function detectLang() {
  const nav = navigator as any;
  const l = (nav.languages && nav.languages[0]) || nav.language || "en-US";
  return l;
}

function speak(text: string, lang: string) {
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === "auto" ? detectLang() : lang;
  window.speechSynthesis.speak(utter);
}

function understand(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("weather") || p.includes("मौसम") || p.includes("আবহাওয়া") || p.includes("കാലാവസ്ഥ")) {
    return "मैंने आपका मौसम संबंधी प्रश्न समझा। कृपया शहर या स्थान बताइए, मैं जोखिम और सलाह बताऊँगा।";
  }
  if (p.includes("disease") || p.includes("रोग") || p.includes("रोग") || p.includes("病")) {
    return "फसल के रोग के लिए पत्ते की स्पष्ट फोटो लें या समस्या के लक्षण बताएं, मैं उपचार सुझाऊंगा।";
  }
  if (p.includes("fertilizer") || p.includes("खाद") || p.includes("urea")) {
    return "खाद की मात्रा फसल और मिट्टी पर निर्भर है। कृपया फसल का नाम और क्षेत्र बताइए, मैं अनुमान बताऊँगा।";
  }
  if (p.includes("scheme") || p.includes("योजना")) {
    return "सरकारी योजनाओं के बारे में बताने के लिए राज्य और फसल बताइए, मैं संबंधित योजनाएँ बताऊँगा।";
  }
  return "मैं आपकी समस्या समझने की कोशिश कर रहा हूँ। कृपया फसल, स्थान और समस्या संक्षेप में बताएँ।";
}

export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState<string>("auto");
  const [lastUser, setLastUser] = useState("");
  const [lastBot, setLastBot] = useState("");

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;
  }, []);

  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (!listening) { try { rec.stop(); } catch {} return; }
    rec.lang = lang === "auto" ? detectLang() : lang;
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      setLastUser(text);
      const reply = understand(text);
      setLastBot(reply);
      speak(reply, rec.lang);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    try { rec.start(); } catch {}
    return () => { try { rec.stop(); } catch {} };
  }, [listening, lang]);

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50 space-y-2">
        {open && (
          <Card className="w-80 shadow-lg">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Voice Assistant</div>
                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Lang" /></SelectTrigger>
                  <SelectContent>
                    {LANGS.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                {lastUser ? `You: ${lastUser}` : "Tap mic and speak..."}
              </div>
              {lastBot && (
                <div className="text-sm flex items-start gap-2">
                  <Volume2 className="w-4 h-4 mt-0.5" />
                  <span>{lastBot}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        <Button size="icon" className="rounded-full h-14 w-14 shadow-lg" onClick={() => setOpen(o => !o)} aria-label="Toggle Voice Assistant">
          {open ? <Mic className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        {open && (
          <Button size="icon" variant={listening ? "default" : "outline"} className="rounded-full h-14 w-14 shadow-lg" onClick={() => setListening(v => !v)} aria-label="Start/Stop Listening">
            {listening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
        )}
      </div>
    </>
  );
}
