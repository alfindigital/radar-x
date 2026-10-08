import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mono text-[10px] uppercase tracking-[0.2em] acc">404 · no instrument at this route</div>
      <h1 className="mt-3 text-[26px] font-bold tracking-tight">Nothing on the tape here.</h1>
      <p className="mt-2 text-[13px] dim">
        The symbol or page you asked for is not in the saved snapshot. Coverage varies by issuer; an absent route means
        no usable evidence, not a zero.
      </p>
      <div className="mono mt-6 flex items-center justify-center gap-4 text-[11px] uppercase tracking-wider">
        <Link href="/" className="acc hover:underline">
          Exit Watch
        </Link>
        <span className="faint">·</span>
        <Link href="/broker" className="dim hover:text-ink">
          Brokers
        </Link>
        <span className="faint">·</span>
        <Link href="/methodology" className="dim hover:text-ink">
          Methodology
        </Link>
      </div>
    </div>
  );
}
