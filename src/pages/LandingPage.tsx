import { useEffect } from "react";
import { Navbar } from "@/components/marketing/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { ValueStrip } from "@/components/marketing/ValueStrip";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ProductShowcase } from "@/components/marketing/ProductShowcase";
import { Audience } from "@/components/marketing/Audience";
import { About } from "@/components/marketing/About";
import { FAQ } from "@/components/marketing/FAQ";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { Footer } from "@/components/marketing/Footer";

export function LandingPage() {
  useEffect(() => {
    document.title = "DocuMind AI — Turn Your Documents Into Answers";
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-lg border border-brand-300/40 bg-brand-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content">
        <Hero />
        <ValueStrip />
        <Features />
        <HowItWorks />
        <ProductShowcase />
        <Audience />
        <About />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
