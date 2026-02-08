import MarketingShell from "@/components/marketing/MarketingShell";
import {
  CTASection,
  HeroSection,
  HighLevelUSPSection,
  LogoMarquee,
} from "@/components/marketing/LandingSections";

export default function LandingPage() {
  return (
    <MarketingShell>
      <main>
        <HeroSection />
        <LogoMarquee />
        <HighLevelUSPSection />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
