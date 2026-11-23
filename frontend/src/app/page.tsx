import { Detector } from "@/components/Detector";
import { Footer } from "@/components/Footer";
import { HowItWorks } from "@/components/HowItWorks";
import { ModelArchitecture } from "@/components/ModelArchitecture";

export default function Home() {
  return (
    // Phones: the grey canvas fills the screen.
    // Tablet/desktop: a white page with the app inside a large rounded grey frame, as in the design.
    <div className="min-h-dvh sm:p-4 lg:p-8">
      <div className="mx-auto min-h-dvh max-w-7xl bg-canvas sm:min-h-[calc(100dvh-2rem)] sm:rounded-[2.5rem] sm:shadow-[var(--shadow-frame)] lg:min-h-[calc(100dvh-4rem)]">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-8 lg:gap-20 lg:px-10 lg:pt-12">
          <Detector />

          {/* Full-width sections below the app */}
          <section aria-labelledby="how-title">
            <HowItWorks headingId="how-title" />
          </section>
          <ModelArchitecture />
        </main>

        <div className="mx-auto w-full max-w-6xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-16 sm:px-6 lg:px-10">
          <Footer />
        </div>
      </div>
    </div>
  );
}
