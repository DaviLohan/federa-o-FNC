import { Hero } from "@/components/landing/Hero";
import { Benefits } from "@/components/landing/Benefits";
import { Stats } from "@/components/landing/Stats";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { ActiveChampionships } from "@/components/landing/ActiveChampionships";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Benefits />
      <Stats />
      <HowItWorks />
      <Features />
      <ActiveChampionships />
      <FinalCTA />
    </main>
  );
}
