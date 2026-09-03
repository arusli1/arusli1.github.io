"use client";

import { GlitchText } from "@/components/GlitchText";
import { GlyphIcon, ICON_REVEAL_TOTAL_MS, LINKS, useIconAnimStyles } from "@/components/SocialBar";
import { useRevealGlitch } from "@/components/useRevealGlitch";

export function Footer() {
  const { ref, revealing } = useRevealGlitch(ICON_REVEAL_TOTAL_MS);
  const icons = useIconAnimStyles(LINKS.length, revealing);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 px-2 pb-8 pt-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {LINKS.map(({ name, href, path, viewBox }, i) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={name}
            style={icons[i].style}
            className={`icon-rgb-glitch text-ink ${revealing ? "is-revealing" : ""} ${icons[i].className}`}
          >
            <GlyphIcon path={path} viewBox={viewBox} size="3.5rem" />
          </a>
        ))}
      </div>
      <p className="font-mono text-sm text-ink">
        <GlitchText content="Best by email." reveal={revealing} />
      </p>
    </div>
  );
}
