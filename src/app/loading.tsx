export default function Loading() {
  return (
    <div className="flex items-center gap-3 py-10">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acc opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-acc" />
      </span>
      <span className="mono text-[11px] uppercase tracking-[0.16em] faint">Loading instrument data</span>
    </div>
  );
}
