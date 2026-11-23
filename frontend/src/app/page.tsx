import { AboutMe } from "@/components/AboutMe";
import { Detector } from "@/components/Detector";
import { Footer } from "@/components/Footer";
import { HowItWorks } from "@/components/HowItWorks";
import { ModelArchitecture } from "@/components/ModelArchitecture";
import { NavBar } from "@/components/NavBar";
import { Projects } from "@/components/Projects";

export default function Home() {
  return (
    // Phones: the grey canvas fills the screen.
    // Tablet/desktop: a white page with the app inside a large rounded grey frame, as in the design.
    <div className="min-h-dvh sm:p-4 lg:p-8">
      <div className="mx-auto min-h-dvh max-w-7xl bg-canvas sm:min-h-[calc(100dvh-2rem)] sm:rounded-[2.5rem] sm:shadow-[var(--shadow-frame)] lg:min-h-[calc(100dvh-4rem)]">
        {/* Sticky here (not inside NavBar), so it stays while the whole page scrolls */}
        <div className="sticky top-0 z-30 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:rounded-t-[2.5rem] sm:pt-0">
          <NavBar />
        </div>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pt-6 sm:px-6 sm:pt-8 lg:gap-24 lg:px-10 lg:pt-10">
          <section id="detector" aria-label="Song detector" className="scroll-mt-24">
            <Detector />
          </section>

          <section id="how" aria-labelledby="how-title" className="scroll-mt-24">
            <HowItWorks headingId="how-title" />
          </section>

          <ModelArchitecture />
          <AboutMe />
          <Projects />
        </main>

        <div className="mx-auto w-full max-w-6xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-20 sm:px-6 lg:px-10">
          <Footer />
        </div>
      </div>
    </div>
  );
}
