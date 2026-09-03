"use client";

import { GlitchText } from "@/components/GlitchText";
import { useRevealGlitch } from "@/components/useRevealGlitch";

export function Intro({
  className = "pb-2 pt-4",
  paragraphs,
}: {
  className?: string;
  paragraphs: string[];
}) {
  const { ref, revealing } = useRevealGlitch();

  return (
    <div ref={ref} className={`mx-auto max-w-lg px-4 ${className}`}>
      <div className="text-left font-mono text-sm leading-relaxed text-ink">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className={i > 0 ? "mt-4" : undefined}>
            <GlitchText text={paragraph} reveal={revealing} />
          </p>
        ))}
      </div>
    </div>
  );
}
