"use client";

import type { Ref } from "react";

import { HowItWorks } from "@/components/HowItWorks";
import { CloseIcon } from "@/components/icons";

/**
 * "How it works" in a native <dialog>: focus is trapped inside, Esc closes it,
 * and so does tapping the dimmed backdrop. A bottom sheet on phones, centered on larger screens.
 */
export function InfoSheet({ ref }: { ref: Ref<HTMLDialogElement> }) {
  return (
    <dialog
      ref={ref}
      aria-labelledby="info-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close(); // backdrop tap
      }}
      className={[
        "m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-[2rem] bg-canvas p-0 text-ink",
        "backdrop:bg-black/45 open:motion-safe:animate-fade-in",
        "sm:m-auto sm:max-w-2xl sm:rounded-[2rem]",
      ].join(" ")}
    >
      <div className="relative px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pb-8">
        <form method="dialog" className="absolute right-4 top-4">
          <button
            type="submit"
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full text-ink-muted shadow-[var(--shadow-soft-sm)] active:shadow-[var(--shadow-soft-inset)]"
          >
            <CloseIcon className="size-5" />
          </button>
        </form>
        <HowItWorks headingId="info-title" headingLevel={2} />
      </div>
    </dialog>
  );
}
