"use client";

import { GlitchText, type GlitchSegment } from "@/components/GlitchText";
import { useRevealGlitch } from "@/components/useRevealGlitch";

export function Intro({
  className = "pb-2 pt-4",
  maxWidth = "max-w-lg",
  heading,
  paragraphs,
}: {
  className?: string;
  maxWidth?: string;
  heading?: string;
  paragraphs: (string | GlitchSegment[])[];
}) {
  const { ref, revealing } = useRevealGlitch();

  return (
    <div ref={ref} className={`mx-auto ${maxWidth} px-2 sm:px-4 ${className}`}>
      {heading && (
        <h1 className="mb-2 text-left font-mono text-sm text-ink">
          <GlitchText content={heading} reveal={revealing} />
        </h1>
      )}
      <div className="text-left font-mono text-sm leading-relaxed text-ink">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className={i > 0 ? "mt-4" : undefined}>
            <GlitchText content={paragraph} reveal={revealing} />
          </p>
        ))}
      </div>
    </div>
  );
}
