import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { Navbar } from "@/components/Navbar";
import { ChatWidget } from "@/components/ChatWidget";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Properties from "@/pages/properties";
import PropertyDetail from "@/pages/property-detail";
import Contact from "@/pages/contact";
import Admin from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/properties" component={Properties} />
      <Route path="/properties/:id" component={PropertyDetail} />
      <Route path="/contact" component={Contact} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  const globalSchema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "RealEstateAgent"],
    "name": "Tony Multi Ventures",
    "url": "https://tonymultiventures.com",
    "logo": "https://tonymultiventures.com/logo.png",
    "description": "Premium real estate agency in Nigeria offering luxury properties, villas, and apartments.",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "NG"
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isAdmin && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(globalSchema) }} />}
      {!isAdmin && <Navbar />}
      <Router />
      {!isAdmin && <ChatWidget />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AppContent />
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
