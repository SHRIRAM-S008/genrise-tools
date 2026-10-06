import { HomeHero } from "@/components/home-hero";
import { FormsStrip } from "@/components/forms-strip";
import { PopularToolsPreview } from "@/components/popular-tools-preview";
import { YourTools } from "@/components/your-tools";
import { StatsStrip } from "@/components/stats-strip";
import { WhyGenRise } from "@/components/why-genrise";
import { KitsShowcase } from "@/components/kits-showcase";
import { NewsletterCapture } from "@/components/newsletter-capture";
import { AdSlot } from "@/components/ad-slot";
import { HomeFaq } from "@/components/home-faq";
import { HideInPwa } from "@/components/hide-in-pwa";
import { PwaWelcome } from "@/components/pwa-welcome";

export default function Home() {
  return (
    <>
      <StatsStrip />
      <PwaWelcome />
      <HideInPwa>
        <HomeHero />
      </HideInPwa>
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 items-start justify-center gap-6 px-4">
        <AdSlot className="mt-24" />
        <main className="flex w-full max-w-6xl flex-1 flex-col pb-20">
          <YourTools />
          <FormsStrip />
          <PopularToolsPreview />
          <KitsShowcase />
          <NewsletterCapture />
          <WhyGenRise />
          <HideInPwa>
            <HomeFaq />
          </HideInPwa>
        </main>
        <AdSlot className="mt-24" />
      </div>
    </>
  );
}
