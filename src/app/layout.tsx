import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { SearchBox } from "@/components/SearchBox";
import MobileNav from "@/components/MobileNav";
import { DesktopNav } from "@/components/PrimaryNav";
import { ThemeToggle } from "@/components/ThemeToggle";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RADAR-X — IDX Market Intelligence",
  description:
    "A reproducible market-intelligence view of Indonesian equity disclosures: exit pressure, institutional positioning, reported ownership, and measured historical outcomes.",
};

// Radar scope mark — concentric rings + one blip. Identity motif, used once here.
function ScopeMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="9.5" stroke="var(--acc)" strokeOpacity="0.55" />
      <circle cx="12" cy="12" r="5.5" stroke="var(--acc)" strokeOpacity="0.35" />
      <line x1="12" y1="12" x2="19.5" y2="6" stroke="var(--acc)" strokeWidth="1.4" />
      <circle cx="16.4" cy="8.9" r="1.6" fill="var(--acc)" />
    </svg>
  );
}

// NAV-A: single top bar on desktop — scope mark, primary routes, search, theme.
function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95">
      <div className="flex h-12 items-center gap-4 px-4 md:gap-5 md:px-8">
        <Link
          href="/"
          className="mono flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] font-semibold tracking-[0.14em]"
        >
          <ScopeMark />
          RADAR<span className="acc">-X</span>
        </Link>
        <DesktopNav />
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <div className="hidden w-[220px] md:block">
            <SearchBox />
          </div>
          <ThemeToggle />
        </div>
      </div>
      {/* Console edge hairline — the one place the accent runs full width. */}
      <div className="h-px bg-acc/40" aria-hidden />
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line px-4 py-6 md:px-8">
      <p className="max-w-3xl text-[11px] leading-relaxed faint">
        RADAR-X presents descriptive statistics from public IDX disclosures via Sectors data. It is not investment
        advice, a buy/sell recommendation, or an allegation about any person. Historical outcomes do not predict
        future returns.
      </p>
      <p className="mono mt-2 text-[10px] faint">SECTORS HACKATHON 2026 · TRACK MARKET INTELLIGENCE</p>
    </footer>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Script id="radarx-theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("radarx-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`}
        </Script>
        <TopNav />
        <MobileNav />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 md:px-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
