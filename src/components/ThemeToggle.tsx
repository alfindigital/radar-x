"use client";

import { useEffect, useSyncExternalStore } from "react";

// TH1: Light / Dark / System. Explicit choice persists in localStorage and sets
// data-theme on <html>; "system" removes the attribute so the media query rules.
// The bootstrap script in layout.tsx runs before paint to avoid theme flash.

type Mode = "light" | "dark" | "system";
const KEY = "radarx-theme";
const EVENT = "radarx-theme";

function getMode(): Mode {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
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

const MODES: Mode[] = ["system", "light", "dark"];
const LABELS: Record<Mode, string> = { system: "System", light: "Light", dark: "Dark" };

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getMode, () => "system" as Mode);

  useEffect(() => {
    apply(mode);
  }, [mode]);

  return (
    <div role="group" aria-label="Theme" className="flex items-center overflow-hidden rounded-md border border-line text-[11px]">
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => {
            if (m === "system") window.localStorage.removeItem(KEY);
            else window.localStorage.setItem(KEY, m);
            apply(m);
            window.dispatchEvent(new Event(EVENT));
          }}
          className={`px-2 py-1 ${mode === m ? "bg-acc-soft text-ink" : "dim"}`}
        >
          {LABELS[m]}
        </button>
      ))}
    </div>
  );
}
