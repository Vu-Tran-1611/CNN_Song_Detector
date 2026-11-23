import { Detector } from "@/components/Detector";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pt-14">
      <Detector />
    </main>
  );
}
