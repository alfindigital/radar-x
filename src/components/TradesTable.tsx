// Insider trades table — shared by issuer dossier & case detail.

import Link from "next/link";
import type { InsiderTrade } from "@/lib/types";
import { safeSourceUrl } from "@/lib/provenance";
import { fmtCurrency, fmtNum, fmtShares } from "./fmt";

export default function TradesTable({ trades, limit }: { trades: InsiderTrade[]; limit?: number }) {
  const rows = limit ? trades.slice(0, limit) : trades;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
            <th className="py-2 pr-3 font-medium">Transaction date</th>
            <th className="py-2 pr-3 font-medium">Holder</th>
            <th className="py-2 pr-3 font-medium">Type</th>
            <th className="py-2 pr-3 font-medium text-right">Shares</th>
            <th className="py-2 pr-3 font-medium text-right">Price</th>
            <th className="py-2 pr-3 font-medium text-right">Value</th>
            <th className="py-2 pr-3 font-medium text-right">Filed at</th>
            <th className="py-2 font-medium text-right">Source</th>
          </tr>
        </thead>
        <tbody className="mono">
          {rows.map((t, i) => (
            <tr key={i} className="border-b border-line/40">
              <td className="py-1.5 pr-3 faint">{t.txnDate}</td>
              <td className="tapcell max-w-[240px] truncate py-1.5 pr-3">
                <Link href={`/person/${encodeURIComponent(t.holderName)}`} className="taplink dim">
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
                <td className="py-1.5 pr-3 text-right">{fmtCurrency(t.value)}</td>
              <td className="py-1.5 pr-3 text-right faint">{t.filedAt?.slice(0, 10) ?? "Unavailable"}</td>
              <td className="py-1.5 text-right">
                {(() => { const url = safeSourceUrl(t.sourceUrl); return url ? <a href={url} target="_blank" rel="noreferrer" className="blue">Open</a> : <span className="faint">Unavailable</span>; })()}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={8} className="py-8 text-center dim">
                No reported ownership transactions in the saved snapshot.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
