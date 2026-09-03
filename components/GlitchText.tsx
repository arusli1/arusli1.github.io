"use client";

import { Fragment, useEffect, useRef } from "react";

// baseline: a small, fixed, close fringe — not zero, and not moving on its
// own. A twitch snaps out further for a moment, then back to this exact spot.
const REST_X = "1px";
const REST_Y = "0px";

// throttle for re-rolling which characters count as "hovered"
const HOVER_ROLL_INTERVAL = 90;
// how long a rolled chunk stays eligible to twitch — a timestamp, not a
// mouseleave flag, so a missed leave event can never leave it glitching
const HOVER_CHUNK_LIFETIME = 420;

// scroll-reveal: text splits into big contiguous chunks, each chunk pulsing
// glitch/normal/glitch/normal in sync (one shared offset per chunk per
// pulse) rather than every character fading out independently. Each chunk
// rolls its own pulse count/durations so chunks don't all glitch in lockstep.
const REVEAL_CHUNK_MIN = 8;
const REVEAL_CHUNK_MAX = 18;
const REVEAL_CHUNK_STAGGER_MIN = 25; // ms between one chunk starting and the next
const REVEAL_CHUNK_STAGGER_MAX = 55;
const REVEAL_ON_MIN = 45;
const REVEAL_ON_MAX = 80;
const REVEAL_OFF_MIN = 28;
const REVEAL_OFF_MAX = 58;
const REVEAL_CYCLES_MIN = 1;
const REVEAL_CYCLES_MAX = 2;

// links always glitch as one synced block, never per-char, on hover/select
const LINK_TWITCH_REROLL_MIN = 90;
const LINK_TWITCH_REROLL_MAX = 170;

function shadow(x: string, y: string) {
  return `${x} ${y} #ff2d55, calc(${x} * -1) calc(${y} * -1) #33ccff`;
}

// varying chunk size around the cursor: sometimes a couple characters,
// sometimes about a word, sometimes a run spanning a few words
function rollChunkLength() {
  const r = Math.random();
  if (r < 0.35) return 1 + Math.floor(Math.random() * 3); // 1-3 chars
  if (r < 0.75) return 3 + Math.floor(Math.random() * 5); // 3-7 chars, ~a word
  return 7 + Math.floor(Math.random() * 10); // 7-16 chars, spans words
}

// a run of plain text, or a run that should render as a clickable link
export type GlitchSegment = string | { text: string; href: string };

export function GlitchText({
  content,
  reveal = false,
}: {
  content: GlitchSegment | GlitchSegment[];
  reveal?: boolean;
}) {
  const segments = Array.isArray(content) ? content : [content];
  const text = segments.map((s) => (typeof s === "string" ? s : s.text)).join("");
  const rootRef = useRef<HTMLSpanElement>(null);
  const revealApiRef = useRef<{ triggerReveal: () => void } | null>(null);
  const wasRevealingRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chars = Array.from(root.querySelectorAll<HTMLSpanElement>("span"));
    const indexOf = new Map<HTMLSpanElement, number>(chars.map((el, i) => [el, i]));

    // per-char: the link <a> this char lives inside, or null for plain text
    const linkOf = chars.map((el) => el.closest<HTMLAnchorElement>("a.font-link"));
    const linkTwitchUntil = new Map<HTMLAnchorElement, number>(); // current synced-offset hold expiry
    const linkTwitchValue = new Map<HTMLAnchorElement, { sign: number; mag: number }>();

    const until = chars.map(() => 0); // per-char twitch hold expiry
    const twitching = chars.map(() => false);
    const hoverUntil = chars.map(() => 0); // per-char hover-eligibility expiry
    const revealChunkStart = chars.map(() => 0); // per-char: this char's reveal-chunk start time, 0 = none scheduled
    // per-char: shared reference to its chunk's rolled schedule — cumulative
    // ms boundaries, alternating on/off/on/off/..., last entry = total duration
    const revealSchedule: (number[] | null)[] = chars.map(() => null);
    const revealTwitchCache = new Map<string, { sign: number; mag: number }>(); // one shared offset per chunk per pulse
    const selected = chars.map(() => false); // per-char: inside the current browser selection
    let running = false;
    let raf = 0;
    let lastHoverRoll = 0;

    // whether a char currently has any shadow applied at all — either the
    // resting baseline fringe or an active twitch. Ineligible + !active is
    // the true rest state (no shadow); ineligible + active means it needs
    // clearing, not just settling back to the baseline.
    const active = chars.map(() => false);

    function rest(el: HTMLSpanElement) {
      el.style.setProperty("--sel-x", REST_X);
      el.style.setProperty("--sel-y", REST_Y);
      el.style.textShadow = shadow(REST_X, REST_Y);
    }

    function clear(el: HTMLSpanElement) {
      el.style.setProperty("--sel-x", REST_X);
      el.style.setProperty("--sel-y", REST_Y);
      el.style.textShadow = "";
    }

    function twitch(el: HTMLSpanElement, sign: number, mag: number) {
      const x = `${(sign * mag).toFixed(2)}px`;
      const y = `${(-sign * mag * (0.4 + Math.random() * 0.6)).toFixed(2)}px`;
      el.style.setProperty("--sel-x", x);
      el.style.setProperty("--sel-y", y);
      el.style.textShadow = shadow(x, y);
    }

    function randomTwitch(el: HTMLSpanElement) {
      twitch(el, Math.random() < 0.5 ? -1 : 1, 1.4 + Math.random() * 0.8);
    }

    // hover/selection eligibility only — reveal is handled separately below
    // since it drives a synced chunk pulse, not per-char independent twitch
    function isEligible(i: number, now: number) {
      return selected[i] || now < hoverUntil[i];
    }

    // which segment of its chunk's schedule char i is in right now: even
    // index = an "on" (glitch) pulse, odd = an "off" (normal) gap. null if
    // no reveal is scheduled/running for this char.
    function revealSegment(i: number, now: number): { on: boolean; seg: number } | null {
      const start = revealChunkStart[i];
      const sched = revealSchedule[i];
      if (!start || !sched || now < start) return null;
      const elapsed = now - start;
      if (elapsed >= sched[sched.length - 1]) return null;
      for (let j = 0; j < sched.length; j++) {
        if (elapsed < sched[j]) return { on: j % 2 === 0, seg: j };
      }
      return null;
    }

    function revealPending(i: number, now: number) {
      const start = revealChunkStart[i];
      const sched = revealSchedule[i];
      return !!start && !!sched && now < start + sched[sched.length - 1];
    }

    function loop(now: number) {
      let anyEligible = false;
      let anyRevealPending = false;

      chars.forEach((el, i) => {
        if (revealPending(i, now)) anyRevealPending = true;

        const seg = revealSegment(i, now);
        if (seg?.on) {
          // every char in the same chunk, same pulse, shares one offset —
          // that's what reads as a chunk glitching together
          const key = `${revealChunkStart[i]}:${seg.seg}`;
          let t = revealTwitchCache.get(key);
          if (!t) {
            t = { sign: Math.random() < 0.5 ? -1 : 1, mag: 1.6 + Math.random() * 1.2 };
            revealTwitchCache.set(key, t);
          }
          twitch(el, t.sign, t.mag);
          active[i] = true;
          twitching[i] = true;
          anyEligible = true;
          return;
        }

        const link = linkOf[i];
        if (link) {
          const eligible = selected[i] || now < hoverUntil[i];
          if (!eligible) {
            if (active[i]) {
              clear(el);
              active[i] = false;
              twitching[i] = false;
            }
            return;
          }

          anyEligible = true;
          // every char of the same link shares one offset, re-rolled
          // together on an interval — reads as the whole link glitching
          // as a block, never letter by letter
          const twitchUntil = linkTwitchUntil.get(link) ?? 0;
          if (now >= twitchUntil) {
            linkTwitchValue.set(link, { sign: Math.random() < 0.5 ? -1 : 1, mag: 1.6 + Math.random() * 1.2 });
            linkTwitchUntil.set(
              link,
              now + LINK_TWITCH_REROLL_MIN + Math.random() * (LINK_TWITCH_REROLL_MAX - LINK_TWITCH_REROLL_MIN),
            );
          }
          const t = linkTwitchValue.get(link)!;
          twitch(el, t.sign, t.mag);
          active[i] = true;
          twitching[i] = true;
          return;
        }

        const eligible = isEligible(i, now);

        if (!eligible) {
          if (active[i]) {
            clear(el);
            active[i] = false;
            twitching[i] = false;
          }
          return;
        }

        anyEligible = true;
        if (!active[i]) {
          rest(el);
          active[i] = true;
        }

        if (now >= until[i]) {
          if (twitching[i]) {
            rest(el);
            twitching[i] = false;
          }
          if (Math.random() < 0.02) {
            randomTwitch(el);
            twitching[i] = true;
            until[i] = now + 150 + Math.random() * 130;
          }
        }
      });

      // a short run of adjacent characters twitching together, same offset —
      // only when every char in the run is actually eligible, so it never
      // drags an unrelated character along with it
      if (chars.length > 2 && Math.random() < 0.25) {
        const len = Math.min(chars.length, 2 + Math.floor(Math.random() * 3));
        const start = Math.floor(Math.random() * (chars.length - len + 1));
        let allEligible = true;
        for (let i = start; i < start + len; i++) {
          if (linkOf[i] || !isEligible(i, now)) {
            allEligible = false;
            break;
          }
        }
        if (allEligible) {
          const sign = Math.random() < 0.5 ? -1 : 1;
          const mag = 1.4 + Math.random() * 0.8;
          const groupUntil = now + 150 + Math.random() * 130;
          for (let i = start; i < start + len; i++) {
            twitch(chars[i], sign, mag);
            active[i] = true;
            twitching[i] = true;
            until[i] = groupUntil;
          }
        }
      }

      if (!reduceMotion && (anyEligible || anyRevealPending)) {
        raf = requestAnimationFrame(loop);
      } else {
        running = false;
        // nothing left eligible — make sure every char actually settles,
        // don't rely on a next frame that may never come
        for (let i = 0; i < chars.length; i++) {
          if (active[i]) {
            clear(chars[i]);
            active[i] = false;
            twitching[i] = false;
          }
        }
      }
    }

    function ensureRunning() {
      if (running || reduceMotion) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }

    function onMouseMove(e: MouseEvent) {
      const now = performance.now();
      if (now - lastHoverRoll < HOVER_ROLL_INTERVAL) return;
      lastHoverRoll = now;

      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLSpanElement | null;
      const idx = target ? indexOf.get(target) : undefined;
      if (idx === undefined) return;

      const link = linkOf[idx];
      if (link) {
        const expiry = now + HOVER_CHUNK_LIFETIME;
        for (let i = 0; i < chars.length; i++) {
          if (linkOf[i] === link) hoverUntil[i] = Math.max(hoverUntil[i], expiry);
        }
        ensureRunning();
        return;
      }

      const len = rollChunkLength();
      const jitter = Math.floor((Math.random() - 0.5) * 4);
      const start = Math.max(0, Math.min(chars.length - len, idx - Math.floor(len / 2) + jitter));
      const expiry = now + HOVER_CHUNK_LIFETIME;
      for (let i = start; i < Math.min(chars.length, start + len); i++) {
        hoverUntil[i] = Math.max(hoverUntil[i], expiry);
      }
      ensureRunning();
    }

    function onSelectionChange() {
      const sel = document.getSelection();
      // real Range check per character, not "is anything selected anywhere
      // on the page" — otherwise selecting one word glitches every
      // GlitchText instance in full, not just the characters actually
      // highlighted
      const range = sel && sel.rangeCount > 0 && sel.toString() ? sel.getRangeAt(0) : null;
      let any = false;
      for (let i = 0; i < chars.length; i++) {
        const isSelected = !!range && range.intersectsNode(chars[i]);
        selected[i] = isSelected;
        if (isSelected) any = true;
      }
      if (any) ensureRunning();
    }

    // cumulative on/off boundaries for one chunk's pulse count/durations,
    // rolled fresh per chunk so chunks don't all glitch in lockstep
    function rollRevealSchedule() {
      const cycles = REVEAL_CYCLES_MIN + Math.floor(Math.random() * (REVEAL_CYCLES_MAX - REVEAL_CYCLES_MIN + 1));
      const bounds: number[] = [];
      let t = 0;
      for (let c = 0; c < cycles; c++) {
        t += REVEAL_ON_MIN + Math.random() * (REVEAL_ON_MAX - REVEAL_ON_MIN);
        bounds.push(t);
        t += REVEAL_OFF_MIN + Math.random() * (REVEAL_OFF_MAX - REVEAL_OFF_MIN);
        bounds.push(t);
      }
      return bounds;
    }

    function triggerReveal() {
      // chunks stay contiguous ranges (so each one reads as a coherent
      // run of text), but the ORDER they start glitching in is shuffled —
      // otherwise it always visibly sweeps top-down/left-to-right
      const ranges: [number, number][] = [];
      let i = 0;
      while (i < chars.length) {
        const len = REVEAL_CHUNK_MIN + Math.floor(Math.random() * (REVEAL_CHUNK_MAX - REVEAL_CHUNK_MIN + 1));
        const end = Math.min(chars.length, i + len);
        ranges.push([i, end]);
        i = end;
      }
      for (let k = ranges.length - 1; k > 0; k--) {
        const r = Math.floor(Math.random() * (k + 1));
        [ranges[k], ranges[r]] = [ranges[r], ranges[k]];
      }

      let start = performance.now();
      for (const [rangeStart, rangeEnd] of ranges) {
        const sched = rollRevealSchedule();
        for (let j = rangeStart; j < rangeEnd; j++) {
          revealChunkStart[j] = start;
          revealSchedule[j] = sched;
        }
        start += REVEAL_CHUNK_STAGGER_MIN + Math.random() * (REVEAL_CHUNK_STAGGER_MAX - REVEAL_CHUNK_STAGGER_MIN);
      }
      ensureRunning();
    }

    root.addEventListener("mousemove", onMouseMove);
    document.addEventListener("selectionchange", onSelectionChange);
    revealApiRef.current = { triggerReveal };
    if (reveal) triggerReveal();

    return () => {
      root.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("selectionchange", onSelectionChange);
      cancelAnimationFrame(raf);
      revealApiRef.current = null;
      for (const el of chars) el.style.textShadow = "";
    };
    // reveal is only read once at mount to cover a burst already in progress
    // when this text scrolls into view for the first time — every later
    // transition is picked up by the effect below via revealApiRef, so the
    // listeners and rAF loop above never tear down mid-burst
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (reveal && !wasRevealingRef.current) {
      revealApiRef.current?.triggerReveal();
    }
    wasRevealingRef.current = reveal;
  }, [reveal]);

  return (
    <span ref={rootRef}>
      {segments.map((seg, si) => {
        const chars = Array.from(typeof seg === "string" ? seg : seg.text).map((ch, i) => (
          <span key={i}>{ch}</span>
        ));
        if (typeof seg === "string") return <Fragment key={si}>{chars}</Fragment>;
        return (
          <a
            key={si}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-link lowercase"
          >
            {chars}
          </a>
        );
      })}
    </span>
  );
}
