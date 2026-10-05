import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { SearchBox } from "@/components/SearchBox";
import MobileNav from "@/components/MobileNav";
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

const NAV = [
  { href: "/", label: "Exit Watch" },
  { href: "/broker", label: "Brokers" },
  { href: "/asing", label: "Foreign flow" },
  { href: "/rotasi", label: "Sectors" },
  { href: "/kasus", label: "Cases" },
  { href: "/metodologi", label: "Methodology" },
];

// NAV-A: single top bar on desktop — logo, primary routes, search, theme.
function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 md:gap-6 md:px-8">
        <Link href="/" className="mono flex items-center gap-2 text-sm font-semibold tracking-[0.18em]">
          <span className="inline-block h-2 w-2 rounded-full bg-acc" />
          RADAR<span className="acc">-X</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="dim rounded-md px-3 py-1.5 text-[13px] hover:bg-panel-2 hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <SearchBox />
          <ThemeToggle />
        </div>
      </div>
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
      <p className="mt-2 text-[10px] faint">Sectors Hackathon 2026 · Track Market Intelligence</p>
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
        <main className="w-full flex-1 px-4 py-6 md:px-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
