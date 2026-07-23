import { HeroSection } from "../components/landing/HeroSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { ProductScopeSection } from "../components/landing/HowItWorksSection";
import { MapSection } from "../components/landing/MapSection";
import { CtaSection, Footer, PricingPreviewSection } from "../components/landing/PricingSection";
import { Navbar } from "../components/landing/Navbar";
import LandingAIChatbox from "../components/landingChat/LandingAIChatbox";

export default function LandingPage() {
  return (
    <>
      <Navbar variant="landing" />
      <main className="landing-page">
        <HeroSection />
        <FeaturesSection />
        <MapSection />
        <PricingPreviewSection />
        <ProductScopeSection />
        <CtaSection />
      </main>
      <Footer />
      <LandingAIChatbox />
    </>
  );
}
