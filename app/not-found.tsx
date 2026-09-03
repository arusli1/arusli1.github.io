"use client";

import { GlitchText } from "@/components/GlitchText";
import { useRevealGlitch } from "@/components/useRevealGlitch";

export default function NotFound() {
  const { ref, revealing } = useRevealGlitch();

  return (
    <div
      ref={ref}
      className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center font-mono"
    >
      <p className="text-2xl text-ink">
        <GlitchText content="404" reveal={revealing} />
      </p>
      <p className="text-sm text-ink">
        <GlitchText content="This page doesn't exist." reveal={revealing} />
      </p>
      <p className="text-sm">
        <GlitchText
          content={{ text: "back home", href: "/", external: false }}
          reveal={revealing}
        />
      </p>
    </div>
  );
}
