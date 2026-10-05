"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mono text-[10px] uppercase tracking-[0.2em] dist">Feed interrupted</div>
      <h1 className="mt-3 text-[26px] font-bold tracking-tight">This view failed to render.</h1>
      <p className="mt-2 text-[13px] dim">
        A snapshot read or render step threw. The underlying data files are untouched; retry usually restores the view.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mono mt-6 border border-line px-4 py-2 text-[11px] uppercase tracking-wider dim hover:border-line-2 hover:text-ink"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        Retry
      </button>
    </div>
  );
}
