"use client";

import { GlitchText } from "@/components/GlitchText";
import { useRevealGlitch } from "@/components/useRevealGlitch";

const BIO =
  "Andrew Rusli. Sketching in between everything else. Mostly characters, mostly graphite, mostly unfinished.";

export function Intro({ className = "pb-2 pt-4" }: { className?: string }) {
  const { ref, revealing } = useRevealGlitch();

  return (
    <div ref={ref} className={`mx-auto max-w-md px-4 ${className}`}>
      <div className="text-center font-mono text-sm leading-relaxed text-ink">
        <p>
          <GlitchText text={BIO} reveal={revealing} />
        </p>
      </div>
    </div>
  );
}
