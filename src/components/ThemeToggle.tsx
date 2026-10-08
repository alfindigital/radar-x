"use client";

import { useEffect, useSyncExternalStore } from "react";

// TH1: binary light/dark switch — the old system→light→dark cycle made the
// state a puzzle for a two-theme product. An explicit choice persists in
// localStorage as data-theme on <html>; nothing stored means the media query
// rules (globals.css), so OS changes keep flowing for users who never
// toggled. The bootstrap script in layout.tsx runs before paint to avoid
// theme flash. Only the STORED choice may touch data-theme — applying the
// effective mode would pin unset users to whatever the OS resolved at mount.

type Mode = "light" | "dark";
const KEY = "radarx-theme";
const EVENT = "radarx-theme";
const LABELS: Record<Mode, string> = { light: "Light", dark: "Dark" };

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

function writeMode(mode: Mode) {
  memoryMode = mode;
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    /* denied — session-only preference */
  }
}

// The icon reflects the EFFECTIVE theme: stored choice, else OS-resolved.
function getMode(): Mode {
  const stored = readMode();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyStored() {
  const stored = readMode();
  const root = document.documentElement;
  if (stored) root.setAttribute("data-theme", stored);
  else root.removeAttribute("data-theme");
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  // Unset users track the OS — a scheme change must redraw the icon too.
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", onStoreChange);
  return () => {
    window.removeEventListener(EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    mql.removeEventListener("change", onStoreChange);
  };
}

// Filled glyphs share the scope mark's solid language — stroked icons read
// muddy at 16px. The pair crossfades with a quarter-turn on toggle: a state
// change, not decoration (MOTION 1, 150ms like every header control).
export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getMode, () => "dark" as Mode);
  const next: Mode = mode === "dark" ? "light" : "dark";

  useEffect(() => {
    applyStored();
  }, [mode]);

  return (
    <button
      type="button"
      aria-label={`Theme: ${LABELS[mode]}. Switch to ${LABELS[next]}`}
      data-tip={`${LABELS[mode]} · switch to ${LABELS[next]}`}
      onClick={() => {
        writeMode(next);
        applyStored();
        window.dispatchEvent(new Event(EVENT));
      }}
      className="iconbtn tip-r tip-b"
    >
      <span className="relative block h-4 w-4" aria-hidden>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`absolute inset-0 h-full w-full transition duration-150 ease-out ${
            mode === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-45 scale-50 opacity-0"
          }`}
        >
          <circle cx="12" cy="12" r="4.4" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.35 5.35l1.84 1.84M16.81 16.81l1.84 1.84M5.35 18.65l1.84-1.84M16.81 7.19l1.84-1.84" />
          </g>
        </svg>
        <svg
          viewBox="0 0 24 24"
          className={`absolute inset-0 h-full w-full transition duration-150 ease-out ${
            mode === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-45 scale-50 opacity-0"
          }`}
        >
          <path
            fill="currentColor"
            d="M20.2 14.2A8.5 8.5 0 1 1 9.8 3.8a8.5 8.5 0 0 0 10.4 10.4Z"
          />
        </svg>
      </span>
    </button>
  );
}
