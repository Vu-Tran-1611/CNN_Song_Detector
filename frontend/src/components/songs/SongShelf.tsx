"use client";

import { useEffect, useState } from "react";

import { getSongs } from "@/lib/api";
import type { Song } from "@/lib/types";

import { VinylRecord } from "./VinylRecord";

type ShelfState = { status: "loading" } | { status: "ready"; songs: Song[] } | { status: "error"; message: string };

const ITEM_CLASS = "w-[7.5rem] shrink-0 snap-start sm:w-auto";

/** "Songs I can recognize": the model's 10 songs as vinyl records. */
export function SongShelf({ activeSongId }: { activeSongId?: number }) {
  const [state, setState] = useState<ShelfState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    getSongs(controller.signal)
      .then((songs) => setState({ status: "ready", songs }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Couldn't load songs." });
      });
    return () => controller.abort();
  }, []);

  return (
    <section aria-labelledby="shelf-title" className="min-w-0">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 id="shelf-title" className="text-xl font-bold text-ink sm:text-2xl">
          Songs I can recognize
        </h2>
        {state.status === "ready" && <span className="text-sm font-medium text-accent-deep">{state.songs.length} songs</span>}
      </div>

      {state.status === "error" ? (
        <p className="rounded-2xl p-5 text-sm text-ink-muted shadow-[var(--shadow-soft-inset)]">
          {state.message} The song list will appear when the backend is running.
        </p>
      ) : (
        <ul className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-6 pt-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-x-6 sm:gap-y-8 sm:overflow-visible sm:px-0 md:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4">
          {state.status === "loading"
            ? Array.from({ length: 6 }, (_, i) => (
                <li key={i} className={ITEM_CLASS} aria-hidden="true">
                  <div className="aspect-square w-full animate-pulse rounded-full shadow-[var(--shadow-soft-inset)]" />
                </li>
              ))
            : state.songs.map((song) => (
                <li key={song.id} className={ITEM_CLASS}>
                  <VinylRecord song={song} active={song.id === activeSongId} />
                </li>
              ))}
        </ul>
      )}
    </section>
  );
}
