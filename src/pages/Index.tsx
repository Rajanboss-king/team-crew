import Hero from "@/components/Hero";
import Features from "@/components/Features";
import WeatherRisk from "@/components/WeatherRisk";
import DiseaseDetection from "@/components/DiseaseDetection";
import ChatbotSection from "@/components/ChatbotSection";
import Footer from "@/components/Footer";
import VoiceAssistant from "@/components/VoiceAssistant";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <WeatherRisk />
      <DiseaseDetection />
      <ChatbotSection />
      <Footer />
      <VoiceAssistant />
    </main>
  );
};

export default Index;
