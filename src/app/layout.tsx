import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SearchBox } from "@/components/SearchBox";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RADAR-X — Smart Money Positioning IDX",
  description:
    "Peta posisi smart money IDX: siapa (insider, institusi, asing) sedang mengakumulasi atau meninggalkan saham — dari data disclosure resmi. Informasi publik, bukan nasihat investasi.",
};

const NAV = [
  { href: "/", label: "Board", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  { href: "/kasus", label: "Kasus", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/metodologi", label: "Metodologi", icon: "M12 8h.01M12 12v4m9-4a9 9 0 1 1-18 0 9 9 0 0 1 18 0" },
];

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[200px] flex-col border-r border-line bg-panel md:flex">
      <Link
        href="/"
        className="mono flex h-14 items-center gap-2 border-b border-line px-5 text-sm font-bold tracking-[0.2em]"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-acc" />
        RADAR<span className="acc">-X</span>
      </Link>
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="dim flex items-center gap-3 rounded-md px-3 py-2 text-[13px] hover:text-ink"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={n.icon} />
            </svg>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-line p-4">
        <p className="text-[10px] leading-relaxed faint">Sectors API · IDX disclosures · EOD</p>
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-line bg-bg/90 px-4 backdrop-blur md:px-8">
      <Link href="/" className="mono text-sm font-bold tracking-[0.2em] md:hidden">
        RADAR<span className="acc">-X</span>
      </Link>
      <SearchBox />
      <div className="ml-auto hidden text-[10px] faint sm:block">Data end-of-day · bukan nasihat investasi</div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line px-4 py-6 md:px-8">
      <p className="max-w-3xl text-[11px] leading-relaxed faint">
        RADAR-X menyajikan statistik deskriptif atas disclosure publik IDX via Sectors Financial API. Ini bukan
        nasihat investasi, bukan rekomendasi beli/jual, dan bukan tuduhan atas pihak manapun. Semua keputusan
        investasi adalah tanggung jawabmu — lakukan riset sendiri (DYOR).
      </p>
      <p className="mt-2 text-[10px] faint">Sectors Hackathon 2026 · Track Market Intelligence</p>
    </footer>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full">
        <Sidebar />
        <div className="flex min-h-screen w-full flex-col md:pl-[200px]">
          <Topbar />
          <main className="w-full flex-1 px-4 py-6 md:px-8">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
