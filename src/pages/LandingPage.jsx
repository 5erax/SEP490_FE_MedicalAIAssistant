import { HeroSection } from "../components/landing/HeroSection";
import { TickerBar, FeaturesSection } from "../components/landing/FeaturesSection";
import { HowItWorksSection, SocialProofSection } from "../components/landing/HowItWorksSection";
import { MapSection } from "../components/landing/MapSection";
import { PricingSection, CtaSection, FaqSection, Footer } from "../components/landing/PricingSection";
import { SymptomDemoSection } from "../components/landing/SymptomDemoSection";
import { Navbar } from "../components/landing/Navbar";

export default function LandingPage() {
  return (
    <main className="landing-page">
      <Navbar />
      <HeroSection />
      <TickerBar />
      <SymptomDemoSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SocialProofSection />
      <MapSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
