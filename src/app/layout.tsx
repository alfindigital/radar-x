import type { Metadata } from "next";
import { headers } from "next/headers";
import { Archivo, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { SearchBox } from "@/components/SearchBox";
import MobileNav from "@/components/MobileNav";
import { DesktopNav } from "@/components/PrimaryNav";
import { ThemeToggle } from "@/components/ThemeToggle";

const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RadarX · IDX Market Intelligence",
  description:
    "A reproducible market-intelligence view of Indonesian equity disclosures: exit pressure, institutional positioning, reported ownership, and measured historical outcomes.",
};

// Radar scope mark — lit phosphor wedge + beam + one blip in a console badge chip.
function ScopeMark() {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center border border-line bg-panel"
      style={{ borderRadius: "var(--radius-sm)" }}
      aria-hidden
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path d="M12 12 L12 2.6 A9.4 9.4 0 0 1 18.65 5.35 Z" fill="var(--acc)" fillOpacity="0.3" />
        <circle cx="12" cy="12" r="9.4" stroke="var(--acc)" strokeWidth="1.9" />
        <line x1="12" y1="12" x2="18.5" y2="5.5" stroke="var(--acc)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="13.8" cy="7.1" r="1.5" fill="var(--acc)" />
        <circle cx="12" cy="12" r="1.4" fill="var(--acc)" />
      </svg>
    </span>
  );
}

// NAV-A: single top bar on desktop — scope mark, primary routes, search, theme.
function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95">
      <div className="flex h-12 items-center gap-4 px-4 md:gap-5 md:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[15px] font-extrabold leading-none tracking-[-0.01em]"
        >
          <ScopeMark />
          Radar<span className="acc">X</span>
        </Link>
        <DesktopNav />
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <div className="hidden w-[220px] lg:block">
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
        RadarX presents descriptive statistics from public IDX disclosures via Sectors data. It is not investment
        advice, a buy/sell recommendation, or an allegation about any person. Historical outcomes do not predict
        future returns.
      </p>
      <p className="mono mt-2 text-[10px] faint">SECTORS HACKATHON 2026 · TRACK 3 · MARKET INTELLIGENCE</p>
    </footer>
  );
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce");
  return (
    <html lang="en" className={`${archivo.variable} ${jetMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Script id="radarx-theme-init" strategy="beforeInteractive" nonce={nonce ?? undefined}>
          {`try{var t=localStorage.getItem("radarx-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`}
        </Script>
        <TopNav />
        <MobileNav />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-5 md:px-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
