import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Mic, MicOff, Send, Settings2, User, Volume2, VolumeX } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  lang: string;
}

const LANGS = [
  { code: "auto", label: "Auto Detect" },
  { code: "hi", label: "हिंदी (Hindi)" },
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "mr", label: "मराठी (Marathi)" },
];

const LT_URL = (import.meta.env.VITE_LIBRETRANSLATE_URL as string | undefined) || ""; // optional

async function translate(text: string, source: string, target: string): Promise<string> {
  if (!LT_URL || source === target) return text;
  try {
    const resp = await fetch(`${LT_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: source === "auto" ? "auto" : source, target })
    });
    if (!resp.ok) throw new Error("translate failed");
    const data = await resp.json();
    return data?.translatedText || text;
  } catch {
    return text; // graceful fallback
  }
}

function detectBrowserLang(): string {
  const nav = navigator as any;
  const lang: string = nav.language || (nav.languages && nav.languages[0]) || "en";
  const short = lang.split("-")[0];
  return LANGS.some(l => l.code === short) ? short : "en";
}

function speak(text: string, lang: string, enabled: boolean) {
  if (!enabled) return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === "auto" ? detectBrowserLang() : lang;
  synth.speak(utter);
}

function useSpeechToText(active: boolean, lang: string, onResult: (t: string) => void) {
  useEffect(() => {
    if (!active) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = lang === "auto" ? detectBrowserLang() : lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const t = e.results?.[0]?.[0]?.transcript;
      if (t) onResult(t);
    };
    rec.start();
    return () => {
      try { rec.stop(); } catch {}
    };
  }, [active, lang]);
}

function generateResponse(prompt: string, lang: string): string {
  const p = prompt.toLowerCase();
  // Simple rule-based intents and clarifiers
  if (p.includes("scheme") || p.includes("yojana") || p.includes("योजना")) {
    return "सरकारी योजनाओं की जानकारी के लिए आप PM-Kisan, PMFBY (फसल बीमा), और मृदा स्वास्थ्य कार्ड योजना देख सकते हैं। अधिक विवरण चाहें तो अपनी फसल और राज्य बताएँ।";
  }
  if (p.includes("fertilizer") || p.includes("खाद") || p.includes("urea")) {
    return "खाद का उपयोग फसल और मिट्टी की जाँच के आधार पर करें। टमाटर के लिए NPK 12:32:16 रोपाई के समय और बाद में N 46% यूरिया की हल्की डोज़ उपयोगी है। अधिक सटीक सलाह के लिए फसल/एकड़ बताएँ।";
  }
  if (p.includes("weather") || p.includes("मौसम")) {
    return "आज मौसम की जानकारी के लिए ऊपर का Weather Risk सेक्शन देखें या अपना शहर/गाँव बताएं। मैं उसी के अनुसार सलाह दूँगा।";
  }
  if (p.includes("pest") || p.includes("कीट") || p.includes("disease") || p.includes("रोग")) {
    return "कृपया फसल का नाम और समस्या के लक्षण बताएं। यदि संभव हो तो रोगग्रस्त पत्ते की फोटो अपलोड/कैप्चर करें ताकि सटीक सुझाव दिए जा सकें।";
  }
  if (p.trim().length < 5) {
    return "बेहतर सहायता के लिए कृपया अपना सवाल स्पष्ट रूप से लिखें, जैसे: 'गेहूं में जंग रोकने का उपाय?'";
  }
  return "मैं आपकी सहायता के लिए तैयार हूँ। कृपया फसल, स्थान और समस्या का संक्षिप्त विवरण दें।";
}

export default function KisanMitra() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "नमस्ते! मैं किसान मित्र हूँ। Hello! I am Kisan Mitra. How can I help you today?", lang: "hi" }
  ]);
  const [input, setInput] = useState("");
  const [langUI, setLangUI] = useState<string>("auto");
  const [voiceIn, setVoiceIn] = useState(false);
  const [voiceOut, setVoiceOut] = useState(true);

  useSpeechToText(voiceIn, langUI, (t) => setInput(t));

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { role: "user", content: text, lang: langUI };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    // Generate and (optionally) translate assistant response
    const resp = generateResponse(text, langUI);
    const targetLang = langUI === "auto" ? detectBrowserLang() : langUI;
    const translated = await translate(resp, "auto", targetLang);
    const asst: Message = { role: "assistant", content: translated, lang: targetLang };
    setMessages((m) => [...m, asst]);
    speak(translated, targetLang, voiceOut);
  };

  return (
    <main className="min-h-screen py-10">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-6 h-6 text-primary" /> Kisan Mitra
                  </CardTitle>
                  <CardDescription>AI assistant for farmers with multi-language and voice</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={langUI} onValueChange={setLangUI}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Language" /></SelectTrigger>
                    <SelectContent>
                      {LANGS.map(l => (
                        <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant={voiceIn ? "default" : "outline"} onClick={() => setVoiceIn(v => !v)}>
                    {voiceIn ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />} Voice Input
                  </Button>
                  <Button variant={voiceOut ? "default" : "outline"} onClick={() => setVoiceOut(v => !v)}>
                    {voiceOut ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />} Voice Output
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card className="bg-muted/30">
                <ScrollArea className="h-[60vh] p-4">
                  <div className="space-y-4">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.role === "assistant" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>
                          {m.role === "assistant" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        <div className={`flex-1 ${m.role === "user" ? "items-end" : ""}`}>
                          <div className={`inline-block px-4 py-2 rounded-2xl ${m.role === "assistant" ? "bg-card border border-border" : "bg-primary text-primary-foreground"}`}>
                            <p className="text-sm leading-relaxed">{m.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <div className="flex gap-2">
                <Input
                  placeholder="Ask about crops, weather, schemes..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <Button onClick={handleSend}><Send className="w-4 h-4 mr-2" /> Send</Button>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Settings2 className="w-3 h-3" />
                Tip: Enable microphone for voice input. Voice output uses your selected language.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
