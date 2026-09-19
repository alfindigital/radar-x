// Methodology + non-advisory disclaimer — required for hackathon compliance.

export default function MetodologiPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Metodologi</h1>
        <p className="text-xs dim">Bagaimana RADAR-X menghitung posisi smart money.</p>
      </div>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider dim">Positioning Score (-100 … +100)</h2>
        <p>
          Setiap emiten dinilai lintas-seksi (cross-sectional) terhadap semua emiten yang punya aktivitas insider
          dalam 6 bulan terakhir. Tiap komponen adalah z-score robust (median/MAD, di-clip ±3σ):
        </p>
        <pre className="mono overflow-x-auto rounded-md bg-panel-2 p-3 text-xs">
{`score = 0.30·insider_z + 0.25·foreign_trend + 0.20·instnet_z
      + 0.15·retail_exodus_z + 0.10·fclass_shift   →  ×33.3 → -100..+100`}
        </pre>
        <ul className="list-inside list-disc space-y-1 dim">
          <li>
            <b className="text-ink">insider_z (30%)</b> — nilai bersih transaksi insider 90 hari (Rp).
            Cluster (beberapa insider searah) ditimbang +25% per orang tambahan.
          </li>
          <li>
            <b className="text-ink">foreign_trend (25%)</b> — net foreign inflow kumulatif 90 hari,
            dinormalisasi market cap (%).
          </li>
          <li>
            <b className="text-ink">instnet_z (20%)</b> — net buy kohort institusi/asing dari broker
            summary 14 hari.
          </li>
          <li>
            <b className="text-ink">retail_exodus_z (15%)</b> — negatif dari perubahan jumlah pemegang
            saham bulanan (ritel keluar saat smart money masuk).
          </li>
          <li>
            <b className="text-ink">fclass_shift (10%)</b> — pergeseran kelas investor asing bulanan:
            institusi (reksadana, lembaga keuangan) minus individu.
          </li>
        </ul>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider dim">Deteksi pola (Case Score 0-100)</h2>
        <ul className="list-inside list-disc space-y-1 dim">
          <li>
            <b className="text-ink">Keluar Duluan</b> — insider/cluster jual, lalu saham turun ≥5%
            dalam 30 hari.
          </li>
          <li>
            <b className="text-ink">Akumulasi Diam-diam</b> — akumulasi + flow asing abnormal, lalu
            saham naik ≥8% dalam 30 hari.
          </li>
          <li>
            <b className="text-ink">Beli Saat Turun</b> — insider membeli saat harga sedang jatuh.
          </li>
          <li>
            <b className="text-ink">Bergerak Rombongan</b> — ≥3 insider bertransaksi searah dalam
            30 hari.
          </li>
        </ul>
        <p>
          Case score menggabungkan abnormal flow (z), abnormal volume (z), pre-drift vs IHSG, ukuran transaksi
          vs kepemilikan, kecocokan arah, dan besarnya pergerakan setelahnya.
        </p>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider dim">Sumber data</h2>
        <p className="dim">
          Sectors Financial API v2: <span className="mono">filings</span> (transaksi insider parsed),{" "}
          <span className="mono">shareholders-composition</span> (bulanan), <span className="mono">foreign-flow</span>,{" "}
          <span className="mono">broker-summary</span>, <span className="mono">daily</span> &{" "}
          <span className="mono">index-daily</span>. Semua end-of-day; hasil 30 hari diukur dari harga riil,
          bukan prediksi.
        </p>
      </section>

      <section className="panel space-y-3 border-watch/40 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider neutral">Disclaimer</h2>
        <p className="dim">
          RADAR-X adalah alat statistik deskriptif atas disclosure publik IDX. Kami <b>tidak</b> memberikan
          nasihat investasi, rekomendasi beli/jual, target harga, atau jaminan apapun. Pola historis tidak
          menjamin hasil di masa depan. Nama pihak yang tampil berasal dari dokumen disclosure resmi —
          kehadiran mereka bukan tuduhan pelanggaran. Selalu lakukan risetmu sendiri (DYOR) dan konsultasikan
          keputusan dengan penasihat berlisensi.
        </p>
      </section>
    </div>
  );
}
