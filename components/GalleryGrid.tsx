"use client";

import { useEffect, useState } from "react";

// overlap between each image and the one before it, as a % of row width so it
// scales with the row instead of eating a bigger share of it at narrow widths
const GAP_BEFORE = ["0%", "-2.83%", "-0.85%", "-1.7%"];

// per-image vertical nudge, as a % of the image's own height (not a fixed
// px amount) so it stays proportional at any viewport width
const NUDGE_UP = ["-3%", "0%", "0%", "-3.4%"];

// per-image brightness so the inverted graphite reads ~equally bright across
// the row (original pencil pressure varies, so plain invert() doesn't)
const BRIGHTNESS = ["1.35", "1.61", "1.1", "1.32"];

export function GalleryGrid({ sketches }: { sketches: string[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = () => setOpenIndex(null);
  const prev = () =>
    setOpenIndex((i) => (i === null ? i : (i - 1 + sketches.length) % sketches.length));
  const next = () =>
    setOpenIndex((i) => (i === null ? i : (i + 1) % sketches.length));

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex]);

  return (
    <>
      <div className="flex px-6">
        {sketches.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpenIndex(i)}
            style={{ aspectRatio: "3 / 4", marginLeft: GAP_BEFORE[i] ?? "0%" }}
            className="relative block flex-1 z-0 hover:z-10 focus-visible:z-10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain"
              style={{
                transform: `translateY(${NUDGE_UP[i] ?? "0%"})`,
                filter: `invert(1) brightness(${BRIGHTNESS[i] ?? "1"})`,
              }}
            />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-paper/90 p-8"
          onClick={close}
        >
          <span className="absolute left-4 top-4 text-sm text-ink">
            {openIndex + 1} / {sketches.length}
          </span>

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-ink text-base text-paper"
          >
            ×
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous sketch"
            className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink text-base text-paper"
          >
            ‹
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sketches[openIndex]}
            alt=""
            className="max-h-full max-w-full object-contain"
            style={{ filter: `invert(1) brightness(${BRIGHTNESS[openIndex] ?? "1"})` }}
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next sketch"
            className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink text-base text-paper"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
