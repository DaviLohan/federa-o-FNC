import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <FinalCTA />
    </main>
  );
}
