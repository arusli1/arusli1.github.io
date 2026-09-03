"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useRevealGlitch } from "@/components/useRevealGlitch";
import { SKETCH_ELEMENTS, type SketchElement } from "@/components/sketchElements";
import { GAP_HOTSPOTS } from "@/components/gapHotspots";

export type Sketch = { src: string; nudgeUp: string; brightness: string };

// all 4 sketches share this exact pixel size — passed as width/height
// attributes (not just CSS) so the browser knows the aspect ratio before the
// image has loaded, instead of briefly rendering a small broken-image-sized
// placeholder box while it resolves
const SKETCH_INTRINSIC_WIDTH = 1200;
const SKETCH_INTRINSIC_HEIGHT = 1607;

// overlap between the two images in each row, as a % of row width
const ROW_GAPS = ["-12%", "-15%"];

// stacked (below sm) overlap per row, as a % of row width too — margin-top
// percentages are relative to width, not height, in CSS, so these run much
// bigger than ROW_GAPS to read as a real overlap against the images' height
const STACK_GAPS = ["-34%", "-42%"];

// which image in each row (0 = left, 1 = right) sits on top at the overlap —
// fixed, not hover-driven, so it never flips while moving the cursor around
const TOP_INDEX = [1, 0];

// cursor movement triggers nearby sections to pulse-glitch — not one patch
// gliding around glued to the pointer
const HOVER_TRIGGER_INTERVAL = 110;
const HOVER_PATCH_LIFETIME = 650;
// how often hover renders a generic shard/n-gon instead of the nearest real
// element, even when one's right there — real elements now cover most of a
// sketch, so without this every hover in the same spot looks identical
const HOVER_GENERIC_CHANCE = 0.3;

// each element starts materializing at a random point in this window, so a
// pile of elements doesn't queue up strictly by index — the delay stays
// bounded no matter how many elements an image has
const MATERIALIZE_MAX_STAGGER_MS = 300;
// "gone" reads as a brief flicker of absence, not a lingering hole — held
// noticeably shorter than a glitch/settled step
const MATERIALIZE_GONE_MIN_MS = 20;
const MATERIALIZE_GONE_MAX_MS = 50;
const MATERIALIZE_STEP_MIN_MS = 55;
const MATERIALIZE_STEP_MAX_MS = 130;
const MATERIALIZE_MIN_STEPS = 2;
const MATERIALIZE_MAX_STEPS = 7;
// worst case: max stagger + a full-length sequence of the longest steps,
// plus headroom — the row must stay "revealing" for at least this long
const MATERIALIZE_REVEAL_MS =
  MATERIALIZE_MAX_STAGGER_MS + MATERIALIZE_MAX_STEPS * MATERIALIZE_STEP_MAX_MS + 200;

// generic block/band shapes join the real elements on reveal too — not
// everything that glitches has to be a named object. Scales with how many
// real elements the image has, so they stay a clearly-present minority
// rather than getting lost against 30+ elements
const MATERIALIZE_GENERIC_RATIO = 0.28;
const MATERIALIZE_GENERIC_COUNT_MIN = 4;

function clampPct(v: number) {
  return Math.max(0, Math.min(100, v));
}

function polygonClip(points: [number, number][]) {
  return `polygon(${points.map(([x, y]) => `${clampPct(x)}% ${clampPct(y)}%`).join(", ")})`;
}

// a rotated thin band — reads closer to a stroke or a single thin object
// than an axis-aligned box
function bandClip(centerX?: number, centerY?: number) {
  const cx = clampPct((centerX ?? 15 + Math.random() * 70) + (Math.random() - 0.5) * 10);
  const cy = clampPct((centerY ?? 15 + Math.random() * 70) + (Math.random() - 0.5) * 10);
  const len = 55 + Math.random() * 65;
  const thick = 7 + Math.random() * 12;
  const angle = Math.random() * 180;
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const px = -dy;
  const py = dx;
  const hl = len / 2;
  const ht = thick / 2;
  const corners: [number, number][] = [
    [cx - dx * hl - px * ht, cy - dy * hl - py * ht],
    [cx + dx * hl - px * ht, cy + dy * hl - py * ht],
    [cx + dx * hl + px * ht, cy + dy * hl + py * ht],
    [cx - dx * hl + px * ht, cy - dy * hl + py * ht],
  ];
  return polygonClip(corners);
}

function blockClip(centerX?: number, centerY?: number) {
  const w = 16 + Math.random() * 18;
  const h = 16 + Math.random() * 18;
  const left =
    centerX === undefined
      ? Math.random() * (100 - w)
      : Math.min(100 - w, Math.max(0, centerX - w / 2 + (Math.random() - 0.5) * 12));
  const top =
    centerY === undefined
      ? Math.random() * (100 - h)
      : Math.min(100 - h, Math.max(0, centerY - h / 2 + (Math.random() - 0.5) * 12));
  return `inset(${top}% ${100 - left - w}% ${100 - top - h}% ${left}%)`;
}

// an irregular concave/convex n-gon — each vertex's radius is jittered
// independently, so it's never a clean regular polygon
function nGonClip(centerX?: number, centerY?: number) {
  const cx = clampPct((centerX ?? 15 + Math.random() * 70) + (Math.random() - 0.5) * 8);
  const cy = clampPct((centerY ?? 15 + Math.random() * 70) + (Math.random() - 0.5) * 8);
  const sides = 5 + Math.floor(Math.random() * 4);
  const baseRadius = 12 + Math.random() * 22;
  const rotation = Math.random() * Math.PI * 2;
  const points: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    const r = baseRadius * (0.45 + Math.random() * 1.0);
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 0.82]);
  }
  return polygonClip(points);
}

// fallback shape for hover when the cursor isn't over any detected element —
// mostly rotated shards and irregular n-gons, a plain box only occasionally
function genericClip(centerX?: number, centerY?: number) {
  const r = Math.random();
  if (r < 0.48) return bandClip(centerX, centerY);
  if (r < 0.85) return nGonClip(centerX, centerY);
  return blockClip(centerX, centerY);
}

// hover prefers a real detected object over a generic shape: the element
// under the cursor if any, else the nearest one within range — with a
// couple dozen elements per image, nearly every hover point lands near one
const HOVER_ELEMENT_RADIUS = 22;

function centroid(points: [number, number][]): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  return [sx / points.length, sy / points.length];
}

function nearestElement(elements: SketchElement[], px: number, py: number) {
  const inside = elements.find((el) => pointInPolygon(px, py, el.points));
  if (inside) return inside;

  let best: SketchElement | null = null;
  let bestDist = Infinity;
  for (const el of elements) {
    const [cx, cy] = centroid(el.points);
    const dist = Math.hypot(cx - px, cy - py);
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }
  return best && bestDist <= HOVER_ELEMENT_RADIUS ? best : null;
}

function pointInPolygon(px: number, py: number, points: [number, number][]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function keyFor(src: string) {
  return src.split("/").pop() ?? src;
}

// sketch elements are detected against the raw image; the rendered image is
// shifted by nudgeUp (translateY, a % of its own box), so shift the element
// coordinates the same amount to keep them aligned to what's on screen
function elementsFor(sketch: Sketch): SketchElement[] {
  const raw = SKETCH_ELEMENTS[keyFor(sketch.src)] ?? [];
  const nudge = parseFloat(sketch.nudgeUp) || 0;
  if (nudge === 0) return raw;
  return raw.map((el) => ({
    ...el,
    points: el.points.map(([x, y]) => [x, clampPct(y + nudge)] as [number, number]),
  }));
}

function SketchImg({
  sketch,
  className,
  animationDelay,
  alt = "",
}: {
  sketch: Sketch;
  className: string;
  animationDelay?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sketch.src}
      alt={alt}
      width={SKETCH_INTRINSIC_WIDTH}
      height={SKETCH_INTRINSIC_HEIGHT}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className}
      style={
        {
          transform: `translateY(${sketch.nudgeUp})`,
          "--img-brightness": sketch.brightness,
          animationDelay,
        } as React.CSSProperties
      }
    />
  );
}

// a detected object's materialize-in timeline: a random walk through
// "gone" (erased against the page background), "glitch" (a flickered,
// fringed flash of the real image), and "settled" (nothing extra — the
// always-present base already shows correctly), always ending on settled.
// Order and length are randomized per element so nothing repeats the same
// rhythm — could be gone-glitch-settled, glitch-glitch-settled, gone-
// glitch-gone-glitch-settled, and so on.
type MaterializeStep = "gone" | "glitch" | "settled";

function rollMaterializeSequence(): { state: MaterializeStep; holdMs: number }[] {
  // skewed toward the short end (most elements do a quick 2-3 step flash),
  // with an occasional longer, more elaborate one in the tail — not every
  // element at the same "energy" level
  const spread = MATERIALIZE_MAX_STEPS - MATERIALIZE_MIN_STEPS;
  const stepCount = MATERIALIZE_MIN_STEPS + Math.floor(Math.random() ** 1.8 * (spread + 1));
  const steps: { state: MaterializeStep; holdMs: number }[] = [];
  let sawGlitch = false;
  for (let i = 0; i < stepCount - 1; i++) {
    const isLastIntermediate = i === stepCount - 2;
    let state: MaterializeStep;
    if (isLastIntermediate && !sawGlitch) {
      // every element glitches at least once before it settles
      state = "glitch";
    } else {
      const r = Math.random();
      state = r < 0.48 ? "glitch" : r < 0.63 ? "gone" : "settled";
    }
    if (state === "glitch") sawGlitch = true;
    const holdMs =
      state === "gone"
        ? MATERIALIZE_GONE_MIN_MS + Math.random() * (MATERIALIZE_GONE_MAX_MS - MATERIALIZE_GONE_MIN_MS)
        : MATERIALIZE_STEP_MIN_MS + Math.random() * (MATERIALIZE_STEP_MAX_MS - MATERIALIZE_STEP_MIN_MS);
    steps.push({ state, holdMs });
  }
  steps.push({ state: "settled", holdMs: 0 });
  return steps;
}

// a fresh, randomized red/cyan chromatic fringe each glitch step — vary the
// offset and brightness swing, not the colors, matching the icon/text glitch
function glitchFilter(brightness: number) {
  const mag = 1 + Math.random() * 1.5;
  const angle = Math.random() * Math.PI * 2;
  const dx = Math.cos(angle) * mag;
  const dy = Math.sin(angle) * mag;
  const brightnessMul = 0.7 + Math.random() * 0.6;
  return (
    `invert(1) brightness(${(brightness * brightnessMul).toFixed(2)}) ` +
    `drop-shadow(${dx.toFixed(2)}px ${dy.toFixed(2)}px 0 #ff2d55) ` +
    `drop-shadow(${(-dx).toFixed(2)}px ${(-dy).toFixed(2)}px 0 #33ccff)`
  );
}

function MaterializeElement({ sketch, clip }: { sketch: Sketch; clip: string }) {
  const eraseRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const erase = eraseRef.current;
    const flash = flashRef.current;
    if (!erase || !flash) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const brightness = Number(sketch.brightness) || 1;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function apply(state: MaterializeStep) {
      if (!erase || !flash) return;
      if (state === "gone") {
        erase.style.opacity = "1";
        flash.style.opacity = "0";
      } else if (state === "glitch") {
        erase.style.opacity = "0";
        flash.style.filter = glitchFilter(brightness);
        flash.style.opacity = "1";
      } else {
        erase.style.opacity = "0";
        flash.style.opacity = "0";
      }
    }

    // stays the always-correct base image (erase/flash both start at
    // opacity 0) until this element's own staggered start time — nothing
    // should blank out the moment the row starts revealing
    let elapsed = Math.random() * MATERIALIZE_MAX_STAGGER_MS;
    for (const step of rollMaterializeSequence()) {
      timeouts.push(setTimeout(() => apply(step.state), elapsed));
      elapsed += step.holdMs;
    }

    return () => {
      for (const t of timeouts) clearTimeout(t);
    };
  }, [clip, sketch.brightness]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ clipPath: clip }}>
      <div
        ref={eraseRef}
        className="absolute inset-0"
        style={{ backgroundColor: "var(--color-paper)", opacity: 0 }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={flashRef}
        src={sketch.src}
        alt=""
        width={SKETCH_INTRINSIC_WIDTH}
        height={SKETCH_INTRINSIC_HEIGHT}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="pointer-events-none h-full w-full select-none object-contain"
        style={{ transform: `translateY(${sketch.nudgeUp})`, opacity: 0 }}
      />
    </div>
  );
}

function HoverPatch({ sketch, clip }: { sketch: Sketch; clip: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ clipPath: clip }}>
      <SketchImg
        sketch={sketch}
        className="reveal-img is-revealing pointer-events-none h-full w-full select-none object-contain"
      />
    </div>
  );
}

// two overlapping images each get their own hover trigger driven by the row
// (see GalleryRow) instead of their own onMouseMove, so a cursor over the
// overlapping region activates both, not just whichever one is stacked on top
export type GalleryImageHandle = { triggerHoverAt: (clientX: number, clientY: number) => void };

const GalleryImage = forwardRef<GalleryImageHandle, { sketch: Sketch; revealing: boolean }>(
  function GalleryImage({ sketch, revealing }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const elements = useMemo(() => elementsFor(sketch), [sketch]);
    const [hoverPatches, setHoverPatches] = useState<{ id: number; clip: string }[]>([]);
    const nextId = useRef(0);

    // rolled once per reveal burst, not once per render — otherwise these
    // would reshuffle on every unrelated re-render while still revealing.
    // Every known low-density gap gets a bias slot (varied shard/n-gon shape,
    // not a fixed static one), topped up with fully random ones for texture.
    const genericClips = useMemo(() => {
      if (!revealing) return [];
      const hotspots = GAP_HOTSPOTS[keyFor(sketch.src)] ?? [];
      const count = Math.max(MATERIALIZE_GENERIC_COUNT_MIN, Math.round(elements.length * MATERIALIZE_GENERIC_RATIO));
      const clips = hotspots.map(([hx, hy]) => genericClip(hx, hy));
      for (let i = clips.length; i < count; i++) clips.push(genericClip());
      return clips;
    }, [revealing, elements, sketch.src]);

    useImperativeHandle(ref, () => ({
      triggerHoverAt(clientX: number, clientY: number) {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
        const px = ((clientX - rect.left) / rect.width) * 100;
        const py = ((clientY - rect.top) / rect.height) * 100;

        // usually the real object under/near the cursor, but sometimes a
        // fresh generic shard/n-gon even when one's right there — otherwise,
        // now that most of a sketch has a real element nearby, hover would
        // always render the exact same static shape at a given spot instead
        // of ever varying
        const hit = Math.random() < HOVER_GENERIC_CHANCE ? null : nearestElement(elements, px, py);
        const clip = hit ? polygonClip(hit.points) : genericClip(px, py);

        const id = nextId.current++;
        setHoverPatches((prev) => [...prev, { id, clip }]);
        setTimeout(() => {
          setHoverPatches((prev) => prev.filter((p) => p.id !== id));
        }, HOVER_PATCH_LIFETIME);
      },
    }));

    return (
      <div ref={containerRef} className="relative h-full w-full overflow-hidden">
        {/* always-correct steady base — the materialize/hover layers animate on top */}
        <SketchImg
          sketch={sketch}
          className="reveal-img pointer-events-none h-full w-full select-none object-contain"
          alt="Ink sketch by Andrew Rusli"
        />
        {revealing &&
          elements.map((el) => (
            <MaterializeElement key={el.label} sketch={sketch} clip={polygonClip(el.points)} />
          ))}
        {genericClips.map((clip, i) => (
          <MaterializeElement key={`generic-${i}`} sketch={sketch} clip={clip} />
        ))}
        {hoverPatches.map((p) => (
          <HoverPatch key={p.id} sketch={sketch} clip={p.clip} />
        ))}
      </div>
    );
  },
);

function GalleryRow({
  row,
  gap,
  stackGap,
  topIndex,
}: {
  row: Sketch[];
  gap: string;
  stackGap: string;
  topIndex: number;
}) {
  const { ref, revealing } = useRevealGlitch(MATERIALIZE_REVEAL_MS);
  const imageRefs = useRef<(GalleryImageHandle | null)[]>([]);
  const lastTrigger = useRef(0);

  // driven from the row, not each image's own onMouseMove — the two images
  // overlap (negative margin below), and a native per-image listener only
  // ever fires on whichever one is stacked on top at that pixel. Forwarding
  // the same point to every image lets both react in the overlap region.
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const now = performance.now();
    if (now - lastTrigger.current < HOVER_TRIGGER_INTERVAL) return;
    lastTrigger.current = now;
    for (const handle of imageRefs.current) {
      handle?.triggerHoverAt(e.clientX, e.clientY);
    }
  }

  return (
    <div
      ref={ref}
      className="mx-auto flex max-w-5xl flex-col gap-0 px-3 sm:flex-row sm:px-6"
      onMouseMove={handleMouseMove}
    >
      {row.map((sketch, idx) => (
        <div
          key={sketch.src}
          style={
            {
              aspectRatio: "3 / 4",
              "--row-gap": idx > 0 ? gap : "0%",
              "--stack-gap": idx > 0 ? stackGap : "0%",
              zIndex: idx === topIndex ? 1 : 0,
            } as React.CSSProperties
          }
          className="gallery-row-item relative block w-full select-none sm:w-auto sm:flex-1"
        >
          <GalleryImage
            ref={(handle) => {
              imageRefs.current[idx] = handle;
            }}
            sketch={sketch}
            revealing={revealing}
          />
        </div>
      ))}
    </div>
  );
}

export function GalleryGrid({ rows, intros }: { rows: Sketch[][]; intros: React.ReactNode[] }) {
  return (
    <>
      {rows.map((row, r) => (
        <div key={r}>
          {intros[r]}
          <GalleryRow
            row={row}
            gap={ROW_GAPS[r] ?? "-2%"}
            stackGap={STACK_GAPS[r] ?? "-30%"}
            topIndex={TOP_INDEX[r] ?? 1}
          />
        </div>
      ))}
    </>
  );
}
