import { HeroSection } from "../components/landing/HeroSection";
import { TickerBar, FeaturesSection } from "../components/landing/FeaturesSection";
import { HowItWorksSection, SocialProofSection } from "../components/landing/HowItWorksSection";
import { PricingSection, CtaSection, Footer }    from "../components/landing/PricingSection";
import { Navbar } from "../components/landing/Navbar";
export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <TickerBar />
      <Navbar/>
      <FeaturesSection />
      <HowItWorksSection />
      <SocialProofSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </>
  );
}