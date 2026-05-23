import { HeroSection } from "../components/landing/HeroSection";
import { TickerBar, FeaturesSection } from "../components/landing/FeaturesSection";
import { HowItWorksSection, SocialProofSection } from "../components/landing/HowItWorksSection";
import { MapSection } from "../components/landing/MapSection";
import { CtaSection, FaqSection, Footer } from "../components/landing/PricingSection";
import { Navbar } from "../components/landing/Navbar";
import LandingAIChatbox from "../components/landingChat/LandingAIChatbox";

export default function LandingPage() {
  return (
    <main className="landing-page">
      <Navbar />
      <HeroSection />
      <MapSection />
      <TickerBar />
      <FeaturesSection />
      <HowItWorksSection />
      <SocialProofSection />
      <FaqSection />
      <CtaSection />
      <Footer />
      <LandingAIChatbox />
    </main>
  );
}
