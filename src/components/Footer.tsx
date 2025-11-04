import { Leaf } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">SmartAgri Cloud</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Empowering farmers with AI-powered crop disease detection, 
              weather predictions, and personalized farming guidance.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Disease Detection</li>
              <li>Weather Prediction</li>
              <li>Kisan Mitra Chatbot</li>
              <li>Disease Heatmaps</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Help Center</li>
              <li>Contact Us</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© 2024 SmartAgri Cloud. Technology serving the soil. 🌱💚</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
