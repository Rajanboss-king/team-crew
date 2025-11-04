import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CloudRain, MessageSquare, MapPin, Bell, Shield } from "lucide-react";
import cropIcon from "@/assets/icon-crop.png";
import weatherIcon from "@/assets/icon-weather.png";
import chatbotIcon from "@/assets/icon-chatbot.png";

const features = [
  {
    icon: Camera,
    title: "AI Crop Disease Detection",
    description: "Upload crop images and get instant AI-powered disease analysis with treatment recommendations.",
    color: "text-primary",
    gradient: "from-primary/20 to-primary/5"
  },
  {
    icon: CloudRain,
    title: "Weather Risk Prediction",
    description: "Real-time weather monitoring with crop-specific risk alerts based on local conditions.",
    color: "text-accent",
    gradient: "from-accent/20 to-accent/5"
  },
  {
    icon: MessageSquare,
    title: "Kisan Mitra Chatbot",
    description: "24/7 bilingual (Hindi/English) AI assistant for all your farming questions and guidance.",
    color: "text-secondary",
    gradient: "from-secondary/20 to-secondary/5"
  },
  {
    icon: MapPin,
    title: "Disease Heatmaps",
    description: "Visualize crop disease patterns across regions to stay ahead of potential outbreaks.",
    color: "text-primary",
    gradient: "from-primary/20 to-primary/5"
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Get timely notifications about weather changes, disease risks, and treatment updates.",
    color: "text-accent",
    gradient: "from-accent/20 to-accent/5"
  },
  {
    icon: Shield,
    title: "Secure Cloud Storage",
    description: "All your data safely stored and accessible anytime, with personalized recommendations.",
    color: "text-secondary",
    gradient: "from-secondary/20 to-secondary/5"
  }
];

const Features = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Everything You Need to
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Protect Your Crops
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Comprehensive AI-powered tools designed specifically for modern farmers
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50"
              >
                <CardHeader>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
