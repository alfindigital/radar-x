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
    "A reproducible market-intelligence view of Indonesian equity disclosures: positioning, distribution pressure, reported ownership, and measured historical outcomes.",
};

// Radar scope mark — lit phosphor wedge + beam + one blip in a console badge chip.
function ScopeMark({ className = "bg-panel" }: { className?: string }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center border border-line ${className}`}
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
    <header className="sticky top-0 z-20 border-b border-line bg-panel">
      <div className="flex h-12 items-center gap-4 px-4 md:gap-5 md:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[15px] font-extrabold leading-none tracking-[-0.01em]"
        >
          <ScopeMark className="bg-bg" />
          Radar<span className="acc">X</span>
        </Link>
        <DesktopNav />
        <div className="ml-auto flex min-w-0 items-center gap-1">
          <div className="hidden lg:block">
            <SearchBox expandable />
          </div>
          <ThemeToggle />
        </div>
      </div>
      {/* Console edge hairline — the one place the accent runs full width. */}
      <div className="h-px bg-acc/40" aria-hidden />
    </header>
  );
}

// Footer colophon — one quiet row, same chrome as the header: three icon
// controls left (same iconbtn language as the top bar), a hairline, then the
// disclaimer line. The wordmark lives in the header; it is not repeated here.
function Footer() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="flex h-11 items-center gap-1 px-4 md:px-8">
        <Link
          href="/methodology"
          aria-label="Methodology"
          data-tip="Methodology"
          className="iconbtn tip-r"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M3.5 1.75h6L13 5.25v9h-9.5z" strokeLinejoin="round" />
            <path d="M9.5 1.75V5.5H13" strokeLinejoin="round" />
            <path d="M5.75 8.25h4.5M5.75 10.75h4.5" strokeLinecap="round" />
          </svg>
        </Link>
        <a
          href="https://github.com/alfindigital/radar-x"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Source on GitHub"
          data-tip="Source"
          className="iconbtn tip-r"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </a>
        <a
          href="https://t.me/alfindigital"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram @alfindigital"
          data-tip="@alfindigital"
          className="iconbtn tip-r"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </a>
        <span className="mx-1.5 h-4 w-px bg-line" aria-hidden />
        <p className="faint min-w-0 flex-1 truncate text-[11px]">
          <span className="hidden md:inline">Descriptive statistics from public IDX disclosures via Sectors. Not investment advice; past outcomes do not predict future returns.</span>
          <span className="md:hidden">Not investment advice.</span>
        </p>
      </div>
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
