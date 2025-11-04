import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Sprout } from "lucide-react";
import heroImage from "@/assets/hero-farm.jpg";

const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Agricultural fields with modern technology" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Agricultural Intelligence</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="text-foreground">SmartAgri Cloud</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Empowering Farmers
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl">
            Detect crop diseases early, predict weather-based risks, and get personalized treatment 
            suggestions — all from your mobile device. Technology that serves the soil. 🌱
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              size="lg" 
              className="text-lg h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => navigate('/soil-scan')}
            >
              Start Free Analysis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg h-14 px-8 border-2 hover:bg-accent/10 hover:border-accent transition-all duration-300"
              onClick={() => navigate('/kisanmitra')}
            >
              Talk to Kisan Mitra
            </Button>
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg h-14 px-8"
              onClick={() => navigate('/disease-heatmap')}
            >
              Disease Heat Map
            </Button>
            <Button 
              size="lg" 
              variant="default" 
              className="text-lg h-14 px-8 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => navigate('/alerts')}
            >
              Smart Alerts
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-lg h-14 px-8 border-2 flex items-center gap-2"
              onClick={() => navigate('/productivity')}
            >
              <Sprout className="w-5 h-5" /> Productivity
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 pt-8">
            <div className="space-y-1">
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground">Farmers Helped</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-accent">95%</div>
              <div className="text-sm text-muted-foreground">Detection Accuracy</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-secondary">24/7</div>
              <div className="text-sm text-muted-foreground">AI Support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
