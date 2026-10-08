"use client";

import { useEffect, useSyncExternalStore } from "react";

// TH1: Light / Dark / System. Explicit choice persists in localStorage and sets
// data-theme on <html>; "system" removes the attribute so the media query rules.
// The bootstrap script in layout.tsx runs before paint to avoid theme flash.
// Icon-only cycle button: system -> light -> dark -> system.

type Mode = "light" | "dark" | "system";
const KEY = "radarx-theme";
const EVENT = "radarx-theme";
const NEXT: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };
const LABELS: Record<Mode, string> = { system: "Auto", light: "Light", dark: "Dark" };

// Storage may be denied (private mode, policy) — preference falls back to an
// in-memory value for the session and must never break rendering.
let memoryMode: Mode | null = null;

function readMode(): Mode | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return memoryMode;
  }
}

function writeMode(mode: Mode | null) {
  memoryMode = mode;
  try {
    if (mode === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, mode);
  } catch {
    /* denied — session-only preference */
  }
}

function getMode(): Mode {
  if (typeof window === "undefined") return "system";
  return readMode() ?? "system";
}

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

// Filled glyphs, same shape language as the scope mark: thin stroked icons
// read muddy at 15px and look borrowed; solid shapes stay crisp in both themes.
function ModeIcon({ mode }: { mode: Mode }) {
  if (mode === "light")
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="4.6" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.05 5.05l1.7 1.7M17.25 17.25l1.7 1.7M5.05 18.95l1.7-1.7M17.25 6.75l1.7-1.7" />
        </g>
      </svg>
    );
  if (mode === "dark")
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M20.2 14.2A8.5 8.5 0 1 1 9.8 3.8a8.5 8.5 0 0 0 10.4 10.4Z"
        />
      </svg>
    );
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path fill="currentColor" d="M12 3.6a8.4 8.4 0 0 1 0 16.8Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getMode, () => "system" as Mode);

  useEffect(() => {
    apply(mode);
  }, [mode]);

  return (
    <button
      type="button"
      aria-label={`Theme: ${LABELS[mode]}. Switch to ${LABELS[NEXT[mode]]}`}
      data-tip={`${LABELS[mode]} · next: ${LABELS[NEXT[mode]]}`}
      onClick={() => {
        const next = NEXT[mode];
        writeMode(next === "system" ? null : next);
        apply(next);
        window.dispatchEvent(new Event(EVENT));
      }}
      className="tip-r flex h-11 w-11 shrink-0 items-center justify-center border border-line dim hover:border-line-2 hover:text-ink"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      <ModeIcon mode={mode} />
    </button>
  );
}
