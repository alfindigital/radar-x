export default function Loading() {
  return (
    <div className="flex items-center gap-3 py-10" role="status">
      <span className="sweep" aria-hidden />
      <span className="mono text-[11px] uppercase tracking-[0.16em] faint">Loading instrument data</span>
    </div>
  );
}
