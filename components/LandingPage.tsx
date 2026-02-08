import MarketingShell from "@/components/marketing/MarketingShell";
import {
  BentoUSPSection,
  CTASection,
  FAQSection,
  HeroSection,
  HowItWorks,
  LogoMarquee,
} from "@/components/marketing/LandingSections";

export default function LandingPage() {
  return (
    <MarketingShell>
      <main>
        <HeroSection />
        <LogoMarquee />
        <BentoUSPSection />
        <HowItWorks />
        <FAQSection />
        <CTASection />
      </main>
    </MarketingShell>
  );
}

