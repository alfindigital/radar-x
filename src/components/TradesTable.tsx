// Insider trades table — shared by issuer dossier & case detail.

import Link from "next/link";
import type { InsiderTrade } from "@/lib/types";
import { fmtIDR, fmtNum, fmtShares } from "./fmt";

export default function TradesTable({ trades, limit }: { trades: InsiderTrade[]; limit?: number }) {
  const rows = limit ? trades.slice(0, limit) : trades;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--line)] text-left text-[10px] uppercase tracking-wider faint">
            <th className="py-2 pr-3 font-medium">Tanggal</th>
            <th className="py-2 pr-3 font-medium">Nama</th>
            <th className="py-2 pr-3 font-medium">Tipe</th>
            <th className="py-2 pr-3 font-medium text-right">Lembar</th>
            <th className="py-2 pr-3 font-medium text-right">Harga</th>
            <th className="py-2 pr-3 font-medium text-right">Nilai</th>
            <th className="hidden py-2 font-medium text-right md:table-cell">% sblm → ssdh</th>
          </tr>
        </thead>
        <tbody className="mono">
          {rows.map((t, i) => (
            <tr key={i} className="border-b border-[var(--line)]/40">
              <td className="py-1.5 pr-3 faint">{t.txnDate}</td>
              <td className="max-w-[240px] truncate py-1.5 pr-3">
                <Link href={`/orang/${encodeURIComponent(t.holderName)}`} className="dim">
                  {t.holderName}
                </Link>
                <span className="faint"> · {t.holderType}</span>
              </td>
              <td className="py-1.5 pr-3">
                <span className={t.txnType === "buy" ? "acc" : t.txnType === "sell" ? "dist" : "dim"}>
                  {t.txnType.toUpperCase()}
                </span>
              </td>
              <td className="py-1.5 pr-3 text-right">{fmtShares(t.amount)}</td>
              <td className="py-1.5 pr-3 text-right faint">{fmtNum(t.price)}</td>
              <td className="py-1.5 pr-3 text-right">Rp{fmtIDR(t.value)}</td>
              <td className="hidden py-1.5 text-right faint md:table-cell">
                {t.pctBefore !== null && t.pctAfter !== null ? `${t.pctBefore}% → ${t.pctAfter}%` : "—"}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={7} className="py-8 text-center dim">
                Tidak ada transaksi insider tercatat.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
