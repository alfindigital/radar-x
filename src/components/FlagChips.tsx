// Factual risk flags for Exit Watch rows — plain chips with definitions,
// never decorations. Absent flags render nothing.

import type { ExitFlags } from "@/lib/types";

const META: { key: keyof ExitFlags; label: string; hint: string }[] = [
  { key: "suspension_recent", label: "SUSP ≤14D", hint: "Trading suspension recorded within 14 days of the as-of date." },
  { key: "corp_action_near", label: "CA ±7D", hint: "Corporate action (e.g. dividend/split) within ±7 days of the window end." },
  { key: "float_constraint", label: "FF<20%", hint: "Reported free float below 20% — flow readings are noisier on thin floats." },
  { key: "sparse_broker", label: "SPARSE", hint: "Fewer than 5 labeled broker observations in the window." },
];

export function FlagChips({ flags }: { flags: ExitFlags }) {
  const active = META.filter((m) => flags[m.key]);
  if (!active.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {active.map((m) => (
        <span key={m.key} className="tag tag-watch" title={m.hint}>
          {m.label}
        </span>
      ))}
    </span>
  );
}
