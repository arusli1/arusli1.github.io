"use client";

import { useEffect, useRef } from "react";

// baseline: a small, fixed, close fringe — not zero, and not moving on its
// own. A twitch snaps out further for a moment, then back to this exact spot.
const REST_X = "1px";
const REST_Y = "0px";

// throttle for re-rolling which characters count as "hovered"
const HOVER_ROLL_INTERVAL = 90;
// how long a rolled chunk stays eligible to twitch — a timestamp, not a
// mouseleave flag, so a missed leave event can never leave it glitching
const HOVER_CHUNK_LIFETIME = 420;
// a reveal burst holds each character for this long, staggered per-char, so
// the burst tapers off character by character instead of every character
// cutting out on the same frame
const REVEAL_BASE = 350;
const REVEAL_STAGGER = 350;

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

export function GlitchText({ text, reveal = false }: { text: string; reveal?: boolean }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const revealApiRef = useRef<{ triggerReveal: () => void } | null>(null);
  const wasRevealingRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chars = Array.from(root.querySelectorAll<HTMLSpanElement>("span"));
    const indexOf = new Map<HTMLSpanElement, number>(chars.map((el, i) => [el, i]));

    const until = chars.map(() => 0); // per-char twitch hold expiry
    const twitching = chars.map(() => false);
    const hoverUntil = chars.map(() => 0); // per-char hover-eligibility expiry
    const revealUntil = chars.map(() => 0); // per-char reveal-eligibility expiry
    let selectionActive = false;
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

    function isEligible(i: number, now: number) {
      return selectionActive || now < hoverUntil[i] || now < revealUntil[i];
    }

    function loop(now: number) {
      let anyEligible = false;
      chars.forEach((el, i) => {
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
          if (!isEligible(i, now)) {
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

      if (!reduceMotion && anyEligible) {
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
      selectionActive = !!document.getSelection()?.toString();
      if (selectionActive) ensureRunning();
    }

    function triggerReveal() {
      const now = performance.now();
      for (let i = 0; i < chars.length; i++) {
        revealUntil[i] = now + REVEAL_BASE + Math.random() * REVEAL_STAGGER;
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
      {Array.from(text).map((ch, i) => (
        <span key={i}>{ch}</span>
      ))}
    </span>
  );
}
