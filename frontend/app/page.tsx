import { Hero } from "@/components/landing/Hero";
import { Benefits } from "@/components/landing/Benefits";
import { Stats } from "@/components/landing/Stats";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { ActiveChampionships } from "@/components/landing/ActiveChampionships";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { ClientErrorBoundary } from "@/components/shared/ClientErrorBoundary";

export default function Home() {
  return (
    <main className="min-h-screen">
      <ClientErrorBoundary>
        <Hero />
      </ClientErrorBoundary>
      <ClientErrorBoundary>
        <Benefits />
      </ClientErrorBoundary>
      <ClientErrorBoundary>
        <Stats />
      </ClientErrorBoundary>
      <ClientErrorBoundary>
        <HowItWorks />
      </ClientErrorBoundary>
      <ClientErrorBoundary>
        <Features />
      </ClientErrorBoundary>
      <ClientErrorBoundary>
        <ActiveChampionships />
      </ClientErrorBoundary>
      <ClientErrorBoundary>
        <FinalCTA />
      </ClientErrorBoundary>
    </main>
  );
}
