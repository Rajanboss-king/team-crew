import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import KisanMitra from "./pages/KisanMitra";
import DiseaseHeatMap from "./pages/DiseaseHeatMap";
import NotFound from "./pages/NotFound";
import SmartAlerts from "./pages/SmartAlerts";
import Productivity from "./pages/Productivity";
import SoilScan from "./pages/SoilScan";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/kisanmitra" element={<KisanMitra />} />
          <Route path="/disease-heatmap" element={<DiseaseHeatMap />} />
          <Route path="/alerts" element={<SmartAlerts />} />
          <Route path="/productivity" element={<Productivity />} />
          <Route path="/soil-scan" element={<SoilScan />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
