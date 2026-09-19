import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

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

function Nav() {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--panel)]">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="mono text-sm font-bold tracking-widest">
          RADAR<span className="acc">-X</span>
        </Link>
        <nav className="flex gap-4 text-xs dim">
          <Link href="/">Board</Link>
          <Link href="/kasus">Kasus</Link>
          <Link href="/metodologi">Metodologi</Link>
        </nav>
        <div className="ml-auto text-[10px] faint">Sectors API · IDX disclosures · EOD</div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t border-[var(--line)] px-4 py-6">
      <div className="mx-auto max-w-6xl text-[11px] leading-relaxed faint">
        <p>
          RADAR-X menyajikan statistik deskriptif atas disclosure publik IDX via Sectors Financial API.
          Ini bukan nasihat investasi, bukan rekomendasi beli/jual, dan bukan tuduhan atas pihak manapun.
          Semua keputusan investasi adalah tanggung jawabmu — lakukan riset sendiri (DYOR).
        </p>
        <p className="mt-2">Sectors Hackathon 2026 · Track Market Intelligence</p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
