# RadarX: pilihan brand dan frontend

Tanggal riset: 2 Oktober 2026. Status: **proposal untuk dipilih owner**, bukan spesifikasi implementasi yang disetujui. RadarX adalah nama kerja. Pilihan ini juga dapat dipakai jika owner memilih StockRadar atau IDXFlow.

Tujuan: memberi 3–5 alternatif per kategori visual dan pengalaman produk, lengkap dengan alasan, kompromi, serta paket kombinasi. Bahasa pembahasan Indonesia; nama brand dan contoh copy produk dalam English. Dokumen ini tidak mengubah aplikasi, data, konfigurasi, atau spesifikasi yang sedang dikerjakan Devin.

## 1. Rekomendasi dan cara memilih

Rekomendasi awal: **A Evidence Desk + V1 Analyst plain + F1 IBM Plex + DASH-A Ranked Research Board + DOS-B Summary-to-evidence**. Identitasnya datang dari batas periode pengamatan, tabel yang rapi, dan akses ke sumber. Ini cocok dengan produk riset IDX yang cakupannya dapat berbeda antar emiten.

Jika menginginkan rasa editorial yang lebih khas, pilih **B Public Ledger**. Jika prioritasnya perubahan yang ringan dari aplikasi sekarang, pilih **C Operator Console** dengan Geist yang sudah digunakan. D memberi prioritas pada keterbacaan; E memberi prioritas pada hubungan dan konteks sektor.

Mulai dari satu dunia A–E, kemudian pilih paket PK1–PK4 di bagian 22. Warna, tone, dan font sebaiknya berasal dari satu arah. Dashboard, dossier, dan visualisasi boleh disesuaikan dengan pekerjaan pengguna. Kontras, sumber, honest-null, dan keyboard tetap persyaratan bersama.

## 2. Design Read: produk yang menjadi dasar

**Fakta lokal saat riset:** [README](../../README.md) mendefinisikan workflow evidence-first untuk saham Indonesia: reported ownership, positioning lintas cohort, foreign-flow context, serta outcome retrospektif emiten versus IHSG. Workflow menggunakan saved snapshot; score bukan forecast atau rekomendasi transaksi. Counts di README bersifat snapshot-specific dan tidak digunakan sebagai angka marketing dalam proposal ini.

**Arah pengembangan:** [PRODUCT_SPEC_V3](../../specs/PRODUCT_SPEC_V3.md) merencanakan Exit Watch EOD, broker cohorts, insider filings, suspension context, dan corporate actions. Inventaris route yang dibaca memiliki Board, foreign flow, sectors, cases, issuer/holder dossier, dan methodology. Route broker dalam spesifikasi ditandai planned di dokumen ini. Riset desain ini tidak membuktikan seluruh status implementasi v3.

**Baseline visual:** [globals.css](../../src/app/globals.css) memakai canvas gelap `#0A0D10`, Geist Sans/Mono, accent transaksi hijau/merah, dan panel radius 10px. [layout.tsx](../../src/app/layout.tsx) memiliki sidebar dan top bar. Ini adalah pembacaan source, bukan audit tampilan runtime.

**Pekerjaan utama pengguna:** menyaring issuer; memahami observasi yang tersedia; membandingkan periode/komponen yang sepadan; membuka laporan sumber; melihat batas coverage. Asumsi desain: pembaca campuran retail IDX dan peneliti, pada desktop maupun mobile. Asumsi ini perlu diuji pada pengguna, bukan dianggap persona terverifikasi.

**Karakter yang dituju:** teliti, langsung, tenang, mudah ditelusuri. Focal point board adalah daftar issuer dan pertanyaan yang sedang dijawab. Focal point dossier adalah ringkasan observasi beserta periode dan sumber. Nama Radar tidak mewajibkan radar chart, radar sweep, atau estetika terminal.

## 3. Keputusan nama: tiga finalis

| Nama | Skor kreatif editorial | Kekuatan | Kompromi praktis |
|---|---:|---|---|
| StockRadar | 9,0/10 | Langsung menjelaskan saham + monitoring; familiar dan mudah disebut | Generik; penggunaan persis pada produk saham sudah ditemukan |
| RadarX | 8,8/10 | Payung kuat untuk ownership, positioning, foreign flow, kasus, dan Exit Watch | Butuh descriptor untuk menjelaskan IDX; penggunaan di crypto juga ditemukan |
| IDXFlow | 8,0/10 | Sangat relevan untuk broker dan foreign flow IDX | Ownership, hubungan, disclosure, dan kasus terdengar sekunder; scope nama terbatas pada IDX |

Rekomendasi brand praktis: **RadarX**, tanpa hyphen untuk wordmark, dengan **IDX Market Intelligence**. StockRadar unggul dalam pemahaman langsung; RadarX memberi ruang identitas lebih luas. Skor bukan survei, tidak mengukur permintaan, dan tidak mencakup clearance merek/domain.

Benturan yang teramati: [StockRadarHQ](https://www.stockradarhq.com/), [StockRadar.ai](https://stockradar.ai/website), dan [RadarX crypto](https://www.radarx.org/). Pencarian publik terbatas tidak membuktikan IDXFlow bebas digunakan. Memilih nama dalam dokumen ini tidak mengganti nama repo atau aplikasi.

## 4. Lima dunia visual

Dials adalah intensitas usulan pada skala 1–5: ENERGY = kekuatan visual; RHYTHM = variasi komposisi; MOTION = intensitas gerak. Belum merupakan preferensi owner yang disetujui.

| ID | Dunia | Rasa dan alasan | Focal point dan motif | Font / dials | Kompromi |
|---|---|---|---|---|---|
| A | **Evidence Desk** | Presisi, meja riset modern; bukti menjadi bagian identitas | Ranking issuer; bounded time window dan source trail | F1; 2 / 3 / 1 | Cobalt bisa generik bila sumber dan komposisi hanya menjadi kartu biasa |
| B | **Public Ledger** | Editorial hangat; cocok membaca laporan dan kasus | Catatan disclosure; heading serif, rules, tanggal laporan | F2; 1 / 4 / 1 | Kurang terasa sebagai scanner cepat; membutuhkan editing ringkasan yang disiplin |
| C | **Operator Console** | Padat dan efisien; cocok untuk perbandingan harian | Tabel dan aligned panels; datum/zero baseline | F3; 2 / 2 / 1 | Mudah terlalu teknis; hindari neon, monospace seluruh halaman, dan terminal palsu |
| D | **Field Research** | Ramah, hangat, keterbacaan kode dan angka diprioritaskan | Observasi terpilih; annotated source blocks | F4; 2 / 3 / 1 | Copper perlu dibedakan dari warna caution dan outflow |
| E | **Clear Atlas** | Lebih lapang; cocok melihat hubungan dan konteks sektor | Sector/holder selection; bounded relationship view | F5; 2 / 4 / 1 | Plum hanya satu accent solid; kartu seragam atau purple gradient menghilangkan identitas |

Semua arah memakai surface datar untuk data, accent terbatas pada aksi/selection/focus, dan whitespace untuk memisahkan konteks dari evidence. Shadow menandai overlay. Tidak ada dekorasi real-time pada snapshot EOD.

## 5. Descriptor: lima alternatif

| ID | Copy | Alasan memilih | Kompromi |
|---|---|---|---|
| DE1 | **IDX Market Intelligence** | Payung terluas dan paling cocok dengan keseluruhan konsep | Intelligence perlu dijelaskan melalui fungsi dan sumber |
| DE2 | Indonesian Equity Research | Mudah dipahami audiens global tanpa mengenal IDX | Lebih panjang dan kurang terasa monitoring |
| DE3 | Ownership & Flow Intelligence | Menjelaskan dua pembeda utama produk | Tidak langsung menyebut Indonesia |
| DE4 | IDX Disclosure & Flow Monitor | Spesifik pada laporan serta flow | Disclosure lebih formal untuk retail |
| DE5 | IDX Exit Pressure Monitor | Fokus kuat untuk arah Exit Watch | Hanya layak menjadi descriptor utama jika v3 telah tersedia dan menjadi pusat produk |

Pilihan awal: DE1. DE5 dapat menjadi descriptor modul, bukan langsung mengganti payung brand.

## 6. Jargon/tagline: lima alternatif

| ID | English tagline | Kesesuaian dan penggunaan | Kompromi |
|---|---|---|---|
| T1 | **Read the flow. Check the evidence.** | Ringkas, dua aksi nyata; hero/brand line utama | Flow lebih dominan daripada ownership |
| T2 | Ownership and flows, in context. | Mencakup fungsi tanpa menjanjikan prediksi | Lebih deskriptif daripada emosional |
| T3 | Read the market through its records. | Khas untuk Public Ledger dan dossier | Kurang menjelaskan scan issuer secara cepat |
| T4 | Compare positions, flows and coverage. | Sangat jujur untuk workspace penelitian | Terasa sebagai product instruction |
| T5 | See the pressure. Read the context. | Cocok untuk Exit Watch sebagai modul v3 | Pressure perlu definisi; jangan digunakan untuk memberi kesan deteksi pasti |

Pilihan awal: T1 untuk brand, T2 untuk penjelasan. Tidak memakai janji menemukan pump berikutnya, memastikan bandar keluar, atau saham aman.

## 7. Tone dan kamus produk: empat alternatif

| ID | Voice | Label utama | CTA spesifik | Contoh state | Kompromi |
|---|---|---|---|---|---|
| V1 | **Analyst plain** | Board, Stock research, Reported holdings, Foreign flow, Cases, Methodology | Open board; Review stock; Read source | Not enough observations to publish this reading. | Paling mudah untuk retail; karakter harus datang dari layout dan ketelitian copy |
| V2 | Evidence desk | Research board, Issuer dossier, Event window, Source records, Historical outcomes | Inspect issuer; Open filing; Compare observations | Unavailable in this snapshot. | Presisi tetapi formal |
| V3 | Market watch | Market watch, Stock profile, Holder changes, Flow comparison, Watch flags | Review changes; View holdings; Clear filters | No stocks match these filters. | Flags wajib punya definisi, tidak menjadi verdict |
| V4 | Editorial research | Overview, Company record, Ownership record, Flow record, Case files, Method notes | Read issuer report; Open original filing | This outcome window is incomplete. | Cocok untuk kasus; kurang cepat untuk scan |

Pilih satu kamus dan gunakan konsisten. Ringkasan mengikuti urutan **observasi → periode → sumber → batas data**. Tuliskan reported holdings, observed net selling, atau broker cohort classified as institutional sesuai field sumber. Broker cohort tidak membuktikan identitas ultimate trader.

Copy v3 yang diusulkan: heading **Exit pressure**; penjelasan **Compare broker-cohort flow, foreign flow and reported insider sales within the observed windows.** CTA **Review contributing observations**. State **Some components are unavailable. Review coverage before comparing this reading.**

## 8. Warna brand: lima palet dengan light/dark

Setiap palet memakai neutral canvas/surface/ink dan satu accent. `border` adalah pemisah dekoratif, bukan batas kontrol. `controlBorder` dipakai jika garis menjadi penanda batas input/kontrol. `accent` juga menjadi link/focus; `onAccent` khusus teks di atas tombol accent.

### A. Evidence Desk: cobalt / blue-grey

| Token | Light | Dark |
|---|---|---|
| canvas | #F4F7FB | #101720 |
| surface | #FFFFFF | #18222F |
| subtle | #E8EEF6 | #202E3E |
| text | #142132 | #EDF3FA |
| muted | #536174 | #AAB8C9 |
| border | #CDD7E4 | #34475E |
| controlBorder | #74869C | #657D99 |
| accent | #2458A6 | #9BC2FF |
| accentSoft | #E2ECFB | #223B5C |
| onAccent | #FFFFFF | #10223A |

Alasan: terasa seperti alat riset dengan aksi jelas, tanpa menjadikan brand hijau sebagai arti buy/safe. Downside: perlu motif window/source yang kuat agar tidak menjadi dashboard biru biasa.

### B. Public Ledger: navy / warm paper

| Token | Light | Dark |
|---|---|---|
| canvas | #F5F2EA | #191B1E |
| surface | #FFFEFA | #23262A |
| subtle | #ECE7DB | #303337 |
| text | #272B31 | #F2EEE5 |
| muted | #625F58 | #BCB6AA |
| border | #D4CDBE | #464A4E |
| controlBorder | #847E71 | #777D85 |
| accent | #294B70 | #AEC9E8 |
| accentSoft | #E0E8EF | #2B4057 |
| onAccent | #FFFFFF | #15263A |

Alasan: white-paper research yang hangat, kuat pada laporan dan kasus. Downside: jangan menambahkan tekstur kertas yang mengganggu angka atau kontras.

### C. Operator Console: teal / slate

| Token | Light | Dark |
|---|---|---|
| canvas | #F2F7F8 | #101B20 |
| surface | #FFFFFF | #192A31 |
| subtle | #E4EFF1 | #223840 |
| text | #182A30 | #EAF4F6 |
| muted | #52676E | #A8BCC3 |
| border | #CBDCDF | #36515C |
| controlBorder | #71888F | #6A8A96 |
| accent | #006B80 | #7DD1E3 |
| accentSoft | #D8EEF2 | #1D4653 |
| onAccent | #FFFFFF | #09232A |

Alasan: instrument-like dan efisien untuk tabel padat. Downside: accent cyan tidak boleh berubah menjadi glow atau indikator live.

### D. Field Research: copper / warm charcoal

| Token | Light | Dark |
|---|---|---|
| canvas | #F7F3EE | #1C1713 |
| surface | #FFFEFC | #2B231D |
| subtle | #EEE5DA | #3A2F27 |
| text | #30261F | #F4EEE7 |
| muted | #6A5D52 | #C4B6A7 |
| border | #D8CABD | #564639 |
| controlBorder | #8E7A6A | #937C67 |
| accent | #7E4B2F | #E8B18A |
| accentSoft | #F0E1D5 | #503721 |
| onAccent | #FFFFFF | #2A1B11 |

Alasan: karakter berbeda dari dashboard fintech umum, dengan angka tetap menjadi pusat. Downside: label/sign harus memisahkan copper brand dari caution/outflow.

### E. Clear Atlas: plum / mineral neutral

| Token | Light | Dark |
|---|---|---|
| canvas | #F6F5F9 | #18141E |
| surface | #FFFFFF | #241E2D |
| subtle | #ECE7F1 | #31283D |
| text | #282331 | #F3EDF8 |
| muted | #625B6E | #C0B2CD |
| border | #D7CFDF | #4A3D59 |
| controlBorder | #887A96 | #857096 |
| accent | #67477D | #D0ACE7 |
| accentSoft | #EBE0F3 | #463052 |
| onAccent | #FFFFFF | #281535 |

Alasan: membedakan selection hubungan/sector dari warna transaksi. Downside: paling rentan menjadi AI-style bila ditambah gradient, orb, atau card mosaic. Gunakan plum solid sebagai satu accent saja.

### Hasil perhitungan kontras token

Perhitungan sRGB memakai rumus relative luminance W3C. Berikut **minimum** rasio pada tiga background `canvas/surface/subtle`; kolom accent juga mencakup `accentSoft`. Button menghitung `onAccent` terhadap `accent`. Lulus di sini hanya untuk pasangan token yang dihitung, bukan sertifikasi UI atau seluruh WCAG.

| Palet / theme | Text | Muted | Accent | Control border | Button text |
|---|---:|---:|---:|---:|---:|
| A light | 13.911 | 5.403 | 5.833 | 3.194 | 6.950 |
| A dark | 12.355 | 6.840 | 6.252 | 3.251 | 8.807 |
| B light | 11.530 | 5.162 | 7.264 | 3.271 | 8.995 |
| B dark | 10.963 | 6.292 | 6.242 | 3.056 | 8.991 |
| C light | 12.682 | 5.084 | 5.105 | 3.188 | 6.150 |
| C dark | 10.991 | 6.234 | 5.894 | 3.331 | 9.414 |
| D light | 11.848 | 5.107 | 5.601 | 3.278 | 7.156 |
| D dark | 11.282 | 6.558 | 5.806 | 3.292 | 8.776 |
| E light | 12.558 | 5.328 | 5.944 | 3.276 | 7.570 |
| E dark | 12.175 | 6.987 | 5.948 | 3.167 | 8.597 |

Ambang dibandingkan sebelum pembulatan: normal text 4.5:1; non-text essentials 3:1 terhadap adjacent background. Pengecualian large text adalah 18pt regular atau 14pt bold, sekitar 24px/18.7px, bukan 18px regular. Jangan memakai decorative border untuk focus/input essential boundary. Background tambahan, opacity, hover, disabled, selected, chart dan forced-colors perlu pengujian rendered terpisah. Sumber: [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## 9. Warna data: empat sistem encoding

Warna identitas brand, identitas cohort, arah arus, dan kondisi sistem adalah dimensi berbeda. Pilih satu sistem utama berikut.

| ID | Sistem | Aturan | Alasan | Kompromi |
|---|---|---|---|---|
| EC1 | Signed-flow bars | Positive blue, negative rust; cohort dipisahkan dengan label/panel | Membaca arah arus tanpa otomatis buy=good | Membutuhkan legend bagi pengguna yang terbiasa hijau/merah |
| EC2 | **Cohort small multiples** | Institusi blue, retail ochre, unclassified neutral; keduanya dapat positif/negatif | Identitas cohort tidak tertukar dengan arah transaksi | Skala harus sama untuk perbandingan absolut; warna perlu separator dan label |
| EC3 | Monochrome evidence | Ink, sign, solid/dashed line, marker berbeda | Cocok print dan aksesibilitas | Perlu legend yang jelas; dash tipis mudah hilang |
| EC4 | Ledger + restrained chart | Tabel nilai/sumber utama; mini-bars dan satu hue sequential pressure | Baik untuk coverage berbeda dan metodologi score | Kurang dramatis untuk teaser; lebih teliti |

Palet status bersama, jika memakai konvensi hijau/merah untuk **signed values**:

| Role | Light | Dark | Makna |
|---|---|---|---|
| inflow / positive | #126C4A | #70D0A7 | Arah nilai teramati, bukan rekomendasi |
| outflow / negative | #AD3930 | #FF9A8E | Arah nilai teramati, bukan bukti niat |
| caution | #805800 | #E7BE69 | Konteks/metode perlu diperiksa |
| systemError | #922652 | #F29ABD | Kegagalan pemuatan/pemrosesan |
| unknown | #586471 | #A8B4C2 | Evidence tidak tersedia |

Minimum kontras status terhadap seluruh canvas/surface/subtle palet A–E: light masing-masing 5.155 / 4.951 / 5.087 / 6.430 / 4.849; dark 6.599 / 6.011 / 7.008 / 5.933 / 5.840. Tidak digunakan sebagai text-on-tint tanpa pemeriksaan tambahan.

EC1 contoh light blue `#1D4ED8` dan rust `#9A3412`; EC2 ochre `#92400E`. Contoh dark blue `#93C5FD`, ochre `#FDBA74`. Terhadap light `#FFFFFF`, blue 6.702:1 dan ochre 7.090:1; terhadap dark `#111923`, blue 9.810:1 dan ochre 10.489:1. Blue/ochre terhadap satu sama lain hanya sekitar 1.06:1, sehingga jangan mengandalkan dua area berdampingan tanpa gap/outline, label, atau bentuk. Implementasi harus memeriksa background palet terpilih.

Label dan sign wajib mendampingi warna. Retail net buying tidak berarti sehat. Low exit reading berarti **Lower observed exit pressure**, bukan Safe. Unknown flag tidak sama dengan No flags. [W3C Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

## 10. Tipografi: lima pairing

| ID | Pairing | Peran / karakter | Kompromi |
|---|---|---|---|
| F1 | **IBM Plex Sans + IBM Plex Mono** | Sans untuk UI/nama/prosa; Mono untuk ticker, tanggal, delta, IDs. Presisi dengan karakter | Mono jangan menjadi font seluruh body atau H1 besar |
| F2 | Source Serif 4 + Source Sans 3 | Serif untuk report headings; Sans untuk UI/tabel. Editorial | Optional Source Code Pro hanya jika numeric/ID treatment memerlukan; tambah biaya font |
| F3 | Geist Sans + Geist Mono | Kontinuitas source sekarang, perubahan terkecil | Komposisi dan evidence motif harus membedakan dari template Vercel |
| F4 | Atkinson Hyperlegible Next + Mono | Karakter/digit dibedakan; ramah pada source IDs | Tidak otomatis membuat UI accessible; tetap perlu contrast, zoom dan keyboard |
| F5 | Google Fonts Manrope + IBM Plex Mono | Approachable overview dengan angka tetap presisi | Pin distribusi dan license; font penulis V5 berbeda dari distribusi Google Fonts |

Usulan hierarchy bersama: body 16px/1.55; UI/table 14px/1.45; caption 13px/1.4; mobile input 16px; page title 28px/1.15; dossier title 36px/1.15. Semua ukuran implementasi memakai unit relatif yang dapat diperbesar. Bobot teks kecil minimal 400. Gunakan `tabular-nums` pada kolom pembanding, align angka kanan, ticker tetap selectable. Nama holder, reason coverage, dan source metadata tidak dikecilkan menjadi 9–10px.

Primary sources: [IBM typeface](https://www.ibm.com/design/language/typography/typeface/) / [repo](https://github.com/IBM/plex/); Adobe [Serif](https://github.com/adobe-fonts/source-serif), [Sans](https://github.com/adobe-fonts/source-sans), [Code Pro](https://github.com/adobe-fonts/source-code-pro); [Geist](https://vercel.com/font) / [repo](https://github.com/vercel/geist-font); [Braille Institute](https://www.brailleinstitute.org/freefont/) / [Next](https://github.com/googlefonts/atkinson-hyperlegible-next) / [Mono](https://github.com/googlefonts/atkinson-hyperlegible-next-mono); [Google Fonts Manrope OFL](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt). Manrope V5 dari [penulis](https://www.sharanda.com/manrope) memakai license terpisah; jangan menamakannya OFL. Simpan license distribusi yang benar saat kelak memasang font.

## 11. Komponen, spacing, dan density: empat alternatif

| ID | Style | Density / typography | Radius / surface | Alasan dan downside |
|---|---|---|---|---|
| U1 | Ledger desk | Desktop row 36–40px; angka/label 14px; mobile records ≥52px | Control 4px, panel 6px; rules horizontal; tanpa shadow tabel | Scan banyak issuer; mudah terlalu padat |
| U2 | **Research workspace** | Desktop row 44–48px; body 15–16px | Control 6px, panel 10px; overlay shadow saja | Seimbang antara scan dan explanation; rail harus reflow di mobile |
| U3 | Market briefing | Rows 52–56px; body 16px; ringkasan tunggal dominan | Control 6px, group 12px; flat surface dan space | Ramah retail; lebih sedikit baris terlihat |
| U4 | Evidence dossier | Prosa 60–68 karakter; rows 56–64px; body 16px | Control 4–6px, source block 4px; heading/rules tanpa card semua | Bagus untuk laporan/metode; kurang efisien untuk board besar |

Spacing usulan: gap dalam kontrol 4–8px; antar field terkait 12–16px; antar kelompok data 24px; antar bagian dossier 32–40px. Bedakan hubungan, bukan satu padding untuk semuanya. Height row desktop bukan ukuran touch target; kontrol touch memiliki sasaran 44×44px. Badge hanya untuk kondisi faktual dengan definisi. Tidak ada empat KPI cards semata untuk mengisi layar.

## 12. Navigasi dan pencarian: empat pilihan masing-masing

| ID | Navigasi | Rationale / biaya |
|---|---|---|
| NAV-A | **Top navigation**: Board, Foreign flow, Sectors, Cases, Methodology | Ringkas dan dekat dengan route nyata; mobile menu berlabel |
| NAV-B | Sidebar sections: Market, Issuers, Evidence, Method | Dapat berkembang; memakan ruang desktop, drawer di mobile |
| NAV-C | Task navigation: Scan issuers, Review disclosures, Compare evidence, Read method | Menjelaskan pekerjaan; Compare dan disclosure view memerlukan fitur/route tambahan |
| NAV-D | Workspace: global search, breadcrumbs, section links | Tenang untuk dossier; user baru perlu orientasi eksplisit |

Current route mapping: Board `/`; Foreign flow `/asing`; Sectors `/rotasi` dan `/rotasi/[sub]`; Cases `/kasus` dan `/kasus/[id]`; issuer `/saham/[ticker]`; holder `/orang/[holder]`; method `/metodologi`. Broker `/broker` dan `/broker/[code]` adalah planned dalam inventaris yang dibaca. Item planned tidak menjadi link aktif sebelum route tersedia. Branding berbahasa English tidak memaksa migrasi URL.

| ID | Search/filter | Perilaku | Kompromi |
|---|---|---|---|
| SEARCH-A | Ticker-first | Autocomplete ticker/nama; Enter memilih hasil eksplisit | Cepat membuka issuer; discovery lintas cohort terbatas |
| SEARCH-B | **Faceted board** | Ticker, sector, periode, component coverage dan direction; applied filters terlihat | Membantu riset; toolbar perlu disclosure pada layar sempit |
| SEARCH-C | Research presets | Reported sells, Foreign net selling, Ownership available; kondisi preset terlihat | Cepat; jangan menjadikannya rekomendasi trading |
| SEARCH-D | Fielded research search | Issuer, holder, record type, tanggal berlabel | Presisi; lebih banyak input, sebagian perlu implementasi tambahan |

Query/filter/sort kelak disimpan di URL. Back memulihkan konteks. Desktop boleh filter setelah input stabil; mobile memakai **Apply filters**. Count diumumkan secara polite setelah perubahan selesai, bukan setiap keystroke. Command palette adalah pelengkap dengan button yang terlihat. [APG Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

## 13. Dashboard: empat arsitektur

Semua arah meletakkan snapshot date, coverage dan pencarian sebelum data. Reading yang ditampilkan harus bernama lengkap; ranking positioning dan exit pressure tidak digabung menjadi satu angka generik.

| ID | Dashboard | Pertanyaan / fokus | Biaya dan tradeoff |
|---|---|---|---|
| DASH-A | **Ranked Research Board** | Issuer mana yang layak diperiksa berdasarkan reading dan coverage terpilih? Table + source rail | Paling dekat dengan fondasi; perlu sort/null/coverage yang benar |
| DASH-B | Daily Evidence Brief | Apa yang dilaporkan dalam periode ini? Ledger kronologis + source detail | Memerlukan pengelompokan records; changes-since-yesterday perlu dua snapshot sepadan |
| DASH-C | Sector Explorer | Bagaimana konteks flow dan coverage lintas sektor? Sector list + issuer table | Aggregate butuh denominator dan unclassified; bukan seluruh sektor jika coverage parsial |
| DASH-D | Comparison Workspace | Apa beda evidence maksimal tiga issuer? Aligned components + source comparison | Fitur interaksi baru; tidak mengasumsikan akun/portfolio/cloud watchlist |

```text
DASH-A
[Snapshot date / coverage / search]
[Board mode / visible filters]
[Issuer ranking table             | Source records]
[Coverage and method              | Case links]

DASH-B
[Snapshot date / coverage / search]
[Evidence brief]
[Disclosure ledger                | Selected source]
[Issuer ranking summary]

DASH-C
[Snapshot date / coverage / sector]
[Sector overview with denominator]
[Selected-sector issuer table     | Coverage]
[Source observations]

DASH-D
[Snapshot date / coverage / search]
[Issuer picker]
[Issuer A | Issuer B | Issuer C]
[Same-period component comparison]
[Coverage / source comparison]
```

Wireframes adalah komposisi, bukan screenshot produk atau data finansial contoh. Pada desktop rail kira-kira 300–340px bila space cukup; pada tablet/mobile ia mengikuti konten utama. Tidak ada informasi sumber yang hanya tersedia pada rail desktop.

## 14. Issuer dossier: empat komposisi

| ID | Komposisi | Urutan utama | Alasan / downside |
|---|---|---|---|
| DOS-A | Timeline-first | Identity + dates → aligned timeline → components → owners → filings/cases | Baik bagi pembaca chart; summary dan missing states tetap harus terlihat |
| DOS-B | **Summary-to-evidence** | Identity + dates → factual summary/coverage → component explanations/sources → timeline → holders/ledger | Cepat lalu teliti; ringkasan harus diturunkan dari field, bukan spekulasi |
| DOS-C | Ownership-first | Identity + effective date → holder list → changes → flow/price context → filings/outcomes | Kuat untuk pemilik/hubungan; flow lebih jauh di bawah |
| DOS-D | Evidence-ledger-first | Identity + dataset status → records → source detail → observation timeline → derived readings | Kuat untuk verifikasi; kurang ringan untuk pengguna pertama |

```text
DOS-A  [Identity / dates] [Timeline] [Components] [Owners] [Ledger / cases]
DOS-B  [Identity / dates] [Summary + coverage] [Sources] [Timeline] [Owners / ledger]
DOS-C  [Identity / effective date] [Holders] [Changes] [Context] [Filings / outcomes]
DOS-D  [Identity / status] [Ledger] [Source detail] [Timeline] [Reading / method]
```

Proposed Exit Door section hanya muncul jika datanya tersedia dan contract v3 telah diverifikasi. Section links mengikuti reading order DOM. Collapse memiliki label/count; critical coverage tidak disembunyikan dalam tooltip.

## 15. Chart storytelling: empat pilihan

| ID | Bentuk | Alasan | Batas |
|---|---|---|---|
| CHART-A | **Aligned small multiples** | Price, signed foreign flow, cohort net, filings dalam panels terpisah dengan tanggal selaras | Unit/scale terpisah; cohort hanya jika data tersedia |
| CHART-B | Cohort comparison | Net institutional-classified/retail-classified per sesi pada zero baseline bersama | Kedua cohort dapat berada di atas atau bawah nol; unknown/unclassified terlihat |
| CHART-C | Event-led timeline | Trade/filing/corporate-action dates utama; harga menjadi konteks | Trade date dan filed date tidak disatukan; tidak menyatakan sebab harga |
| CHART-D | Component ledger | Raw value, period, contribution, availability, weight, source; bar sebagai pendukung | Jangan memakai gauge probability atau safety rating |

Shared rules: gap tetap gap; daily dan cumulative view berlabel berbeda; candlestick hanya dari OHLC yang valid, close-only memakai line/points; shared scale untuk perbandingan absolut; skala independen harus berlabel; rupiah/saham/lot/persen tidak dicampur pada satu axis. Tooltip memiliki tap/focus equivalent. Setiap seri penting memiliki summary tekstual dan **View observations** table. Grafik bukan satu-satunya jalur membaca data. [W3C complex images](https://www.w3.org/WAI/tutorials/images/complex/).

Signature visual yang disarankan untuk v3: **CHART-B + EC2**, dengan observation windows dan source links, bukan opposing red institutional / green retail teams. Visual menunjukkan arus yang dilaporkan, tidak membuktikan ultimate counterparty, koordinasi, atau niat.

## 16. Ownership dan hubungan: empat pilihan

| ID | Tampilan | Alasan | Batas / biaya |
|---|---|---|---|
| OWN-A | **Reported holder table** | Paling dapat diperiksa: holder, pct/shares, effective date, source | Default kuat; pola hubungan tidak langsung terlihat |
| OWN-B | Issuer-holder bipartite graph | Dua jenis node; edge sesuai hubungan dilaporkan | Fitur tambahan; node limit/date/source/hidden count wajib, jangan menyimpulkan kontrol |
| OWN-C | Holder-by-issuer matrix | Membandingkan holder tercatat pada beberapa issuer | Blank/unavailable/not-present harus berbeda; tidak cocok untuk matrix besar di mobile |
| OWN-D | Relationship dossier | Holder → recorded issuer list → source/changes | Alur riset mudah; graph eksploratif tidak menjadi fokus |

Graph memiliki alternate **Show relationship table** dan navigasi selain pan/zoom. Pada mobile default relationship list. Group tags/provider associations bukan bukti beneficial ownership. Tidak menggambar edge spekulatif agar visual terlihat penuh.

## 17. Score, coverage, provenance: tiga pilihan penyajian

| ID | Pola | Alasan | Kompromi |
|---|---|---|---|
| PROV-A | **Inline reading + component availability** | Nama/scale, value, window dan coverage dekat dengan angka; source per component | Terbaik untuk board; space kolom perlu dijaga |
| PROV-B | Evidence side panel | Row selection membuka raw inputs, period, source, unavailable reasons | Kaya untuk desktop; mobile menjadi inline/full-page detail |
| PROV-C | Method disclosure + record ledger | Reading dengan summary; disclosure berlabel membuka metode, ledger sumber terpisah | Cocok dossier; critical missing state tetap inline |

Contract yang tidak opsional: [score.ts](../../src/lib/score.ts) current positioning memiliki rentang **−100..+100**, diterbitkan dengan minimal dua komponen rankable, selain itu null. [Methodology source](../../src/app/metodologi/page.tsx) menjelaskannya sebagai perbandingan deskriptif lintas cohort tersimpan. `coverageWeight` adalah bobot komponen yang rankable, bukan probabilitas atau persentase seluruh pasar tercakup. Tulis **Available component weight** disertai daftar komponen dan alasan.

Rencana Exit pressure **0..100** memiliki arti berbeda dan tidak boleh ditampilkan sebagai current positioning scale. High exit pressure dan high positioning tidak memakai satu green-good badge. Transaction date, filed/report date, effective date, observed-through, dan generated/retrieved date diberi nama sesuai field; satu label Updated tidak cukup.

## 18. Mobile dan table: empat alternatif

| ID | Pola | Kegunaan | Kompromi |
|---|---|---|---|
| MOB-A | **Compact records + expand** | Issuer, reading, coverage, dua observasi; detail inline | Paling mudah pada 360px; perbandingan banyak kolom lebih lambat |
| MOB-B | Bounded table scroll | Ticker sticky, scroll container berlabel/cue; chrome tetap reflow | Baik untuk evidence ledger; jangan membuat seluruh page scroll horizontal |
| MOB-C | Column focus | Ticker + metrik terpilih; selector untuk kelompok kolom | Perbandingan terjaga; critical coverage/source tetap tersedia |
| MOB-D | Metric comparison rows | Satu metrik melintasi issuer A/B/C, lalu metrik berikutnya | Cocok comparison workspace; berbeda dari desktop three-column layout |

Checkpoint implementasi: 360px single column, rail/source inline; 768px tabel terbatas dengan rail di bawah atau dua kolom bila readable; 1440px table fluid + rail atau tiga issuer aligned. Uji juga 320px reflow, 200% text resize, long names, landscape, dan on-screen keyboard. Breakpoint dipasang ketika konten tidak terbaca, bukan karena nama perangkat.

Sasaran kontrol touch 44×44px; WCAG AA target minimum adalah 24×24px atau pengecualian tertentu, bukan klaim bahwa 44px adalah threshold AA. Sources: [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [target-size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## 19. Data states: empat pola presentasi

| ID | Pola | Alasan / downside |
|---|---|---|
| ST1 | **Inline status cells** | State melekat pada value/component; terbaik board. Bisa padat bila reason selalu panjang |
| ST2 | Dataset strip + inline exceptions | Date/status cakupan global di atas; exception pada row. Tidak boleh menutupi state issuer berbeda |
| ST3 | Evidence-first status panel | Komponen tersedia/tidak tersedia beserta reasons terlihat sebelum chart. Lebih banyak ruang |
| ST4 | Section-level fallback | Panel terdampak menjelaskan error/missing dan recovery; data lain tetap terbaca. Wajib date label saat memakai saved data |

Semua pilihan mempertahankan contract berikut; opsi hanya mengubah penempatan.

| State | Copy / behavior |
|---|---|
| Loading | Loading saved observations; stable space, `aria-busy`, tanpa dummy numbers |
| Available | Value + unit + period + source dan tanggal yang tepat |
| Partial | Partial component coverage; komponen unavailable dan alasan terlihat |
| Missing | Unavailable in this snapshot; accessible text menjelaskan sel kosong |
| Unrankable | Not comparable in this cohort; alasan dari metode |
| Empty filter | No issuers match these filters; Clear filters |
| No reported records | No matching reports in the covered period; tidak berarti tidak ada aktivitas |
| Historical | Historical snapshot + actual date; historical bukan otomatis error |
| Stale | Label hanya bila melewati freshness contract yang ditetapkan, bukan sekadar bukan hari ini |
| Error | Bagian terdampak + recovery; retained data memiliki Showing saved data from… dengan date nyata |
| Pending outcome | Outcome window not complete; horizon/target date sesuai data |
| Unavailable outcome | Reason dan basis perhitungan; tidak diubah menjadi 0% |
| Observed zero | 0 hanya bila observasi memang tercatat sebagai nol |

Tidak ada spinners tanpa penjelasan, green empty state, atau zero pengganti failed request. Disable hanya ketika tindakan tidak tersedia, dengan alasan.

## 20. Motion, theme, dan locale: empat / tiga / tiga pilihan

| ID | Motion | Timing usulan / purpose | Reduced motion dan downside |
|---|---|---|---|
| M1 | Instant utility | Data langsung; hover/pressed 100–140ms; focus immediate | Nonessential transitions hilang; paling efisien namun kurang memberi kontinuitas panel |
| M2 | **State transitions** | Tab/popover 140–180ms; drawer 180–220ms, opacity + kecil transform | Ganti gerak dengan state langsung; hasil filter tidak menunggu animasi |
| M3 | Guided investigation | Drilldown 180–220ms; selected-row highlight 140ms | Focus tetap jelas; jangan stagger semua row |
| M4 | Manual case replay | Event pilihan pengguna 240–400ms; dates/values terbaca langsung | Next/Previous langsung; tanpa autoplay; fitur replay perlu data/order nyata |

Satu easing usulan `cubic-bezier(.2,.7,.2,1)`. Gerak hanya membantu perubahan context/selection. Tidak ada count-up, radar sweep berulang, partikel, custom cursor, blinking live dot, atau chart berjalan pada frozen observations. [W3C animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

| ID | Theme behavior | Alasan / downside |
|---|---|---|
| TH1 | **System + saved explicit choice** | Mengikuti kebutuhan perangkat; button Light/Dark/System. Perlu memastikan tidak flash theme salah |
| TH2 | Light first + dark choice | Cocok Public Ledger/reading sumber; pengguna malam perlu toggle jelas |
| TH3 | Dark first + light choice | Kontinuitas source saat ini dan kerja low-light; bukan klaim eye-health/power saving |

Semua theme yang ditawarkan harus complete, termasuk hover, focus, chart, source link, form, overlay dan error. Jangan hanya invert background.

| ID | Locale / angka | Alasan / downside |
|---|---|---|
| LOC1 | **English UI, en-GB dates, IDR units explicit** | Cocok demo berbahasa English; date ditulis day + month name untuk menghindari ambiguity |
| LOC2 | English UI, id-ID numeric locale | Mendekati kebiasaan pembaca lokal; perlu konsisten agar koma/titik tidak tertukar |
| LOC3 | English/Indonesian toggle | Cocok audience lebih luas; seluruh kamus/states harus diterjemahkan, menambah QA |

Timestamp memakai WIB bila berasal dari timestamp/timezone nyata. Date-only tidak diciptakan jamnya. Nilai pendek memakai unit di header; exact value dapat dibuka/copy. Shares bukan lot; konversi hanya dengan definisi yang benar. State null berbeda dari numeric zero.

## 21. Wordmark, icons, dan halaman depan: empat / tiga pilihan

| ID | Wordmark/motif concept | Makna dan alasan | Kompromi |
|---|---|---|---|
| LOG1 | **Bounded window** | RadarX dengan gesture brackets/X; repeated pada observed windows | Brackets hanya sedikit, jangan menjadi code-themed UI |
| LOG2 | Evidence link | Reduced X antara dua anchor points; source/comparison motif | Tidak menggambar hubungan yang tidak didukung records |
| LOG3 | Cut-ring X | Partial static radar arc membentuk X; aplikasi monitoring mudah dikenali | Lebih literal/generik; tanpa target-on-people atau animasi sweep |
| LOG4 | Datum notch | Detail typographic X dan snapshot anchor | Paling tenang; perlu eksekusi typographic yang teliti |

Belum ada logo/aset final dibuat. Gunakan text wordmark sampai owner memilih. Icons hanya untuk arti nyata: search, filter, original source, expand/collapse, theme, date, unavailable/error. Tetap ada label untuk action penting. Source icon berarti source; warna/dot tidak meniru status live. Satu visual grammar dan ukuran stroke, bukan campuran emoji, sparkle, dan arbitrary icon libraries.

| ID | Struktur entry/landing | Alasan | Batas |
|---|---|---|---|
| LAND1 | **App-first**: Board sebagai entry, descriptor dan method link di header | Tunjukkan manfaat lewat tool; paling ringan | Tidak menambahkan marketing page hanya karena kebiasaan template |
| LAND2 | Research introduction: pertanyaan → screenshot nyata bertanggal → Open board / Read methodology | Membantu pengguna baru dan judging | Screenshot nanti dari build nyata; proposal ini tidak memakai fake product shot |
| LAND3 | Case-first introduction: worked retrospective case → sources/windows → Open case / Open board | Storytelling kuat bila kasus terverifikasi | Jangan memilih hanya winner, mengklaim prediksi, atau membuat outcome belum lengkap terlihat sukses |

Tidak ada fake testimonials, company-logo strip, angka pelanggan, pricing tiers, security/performance claims, atau FAQ generik. Jika FAQ dibuat, pertanyaannya tentang periode data, coverage, scale, tanggal laporan, dan arti unavailable.

## 22. Empat paket kombinasi

| ID | Paket | Pilihan lengkap | Alasan / effort relatif |
|---|---|---|---|
| PK1 | **Research balanced** | A + DE1 + T1 + V1 + F1 + U2 + NAV-A + SEARCH-B + DASH-A + DOS-B + CHART-A + EC2 + OWN-A + PROV-A + MOB-A + ST1 + M2 + TH1 + LOC1 + LOG1 + LAND1 | Rekomendasi; identitas kuat dengan workflow dekat existing. Effort sedang karena font/token/header berubah |
| PK2 | Editorial evidence | B + DE2 + T3 + V4 + F2 + U4 + NAV-D + SEARCH-A + DASH-B + DOS-D + CHART-C + EC3 + OWN-D + PROV-C + MOB-A + ST3 + M1 + TH2 + LOC1 + LOG2 + LAND3 | Karakter paling editorial; grouping records/ringkasan memerlukan kerja konten dan UX tambahan |
| PK3 | Dense utility | C + DE1 + T4 + V2 + F3 + U1 + NAV-B + SEARCH-B + DASH-A + DOS-A + CHART-D + EC4 + OWN-A + PROV-B + MOB-B + ST2 + M1 + TH3 + LOC1 + LOG4 + LAND1 | Migrasi font paling ringan; density/mobile table dan source panel perlu dijaga |
| PK4 | Ownership explorer | E + DE3 + T2 + V3 + F5 + U3 + NAV-D + SEARCH-C + DASH-C + DOS-C + CHART-A + EC2 + OWN-C + PROV-A + MOB-C + ST4 + M2 + TH1 + LOC2 + LOG1 + LAND2 | Fokus sektor/ownership; matrix/grouping perlu fitur tambahan, effort tertinggi di antara paket ini |

D Field Research menjadi alternatif palette+F4 untuk PK1 bila ingin karakter lebih hangat dan human. Paket adalah rekomendasi editorial, bukan estimasi biaya terukur atau janji timeline.

Selection worksheet: `Name: ___ | World: ___ | Descriptor: ___ | Tagline: ___ | Package: ___ | Overrides: ___`. Owner boleh memilih paket sebagai starting point. Implementasi baru dimulai setelah arah dipilih; dokumen ini tetap proposal sampai itu terjadi.

## 23. Persyaratan bersama saat implementasi

Native table memiliki caption, scoped headers, numeric units, ticker links, dan sort button dengan `aria-sort`. Null tidak diperlakukan sebagai nol. ARIA grid hanya jika benar-benar berperilaku seperti spreadsheet. [APG Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/).

Satu primary nav, `aria-current`, skip link, logical DOM order, visible focus, serta keyboard Tab/Enter/Escape. Drawer/dialog memindahkan fokus sesuai pattern dan mengembalikannya ke trigger. Sticky header/footer tidak menutup focused controls. Sources tetap accessible tanpa hover; selection bukan color-only. [Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

QA runtime nanti: viewport 360/768/1440 serta 320 reflow; text resize 200%; keyboard/screen reader; reduced motion; light/dark/forced-colors; long issuer/holder names; empty/loading/error/partial/null/outcome pending; correct source URL/date/window; Back/filter persistence; sort dengan null; chart/table equivalence; touch tooltip; overlay focus. Belum dilakukan dalam riset Markdown ini.

Performance policy: rendering snapshot dan data utama jangan menunggu animation atau remote decoration; self-host font distribusi terpilih bila diimplementasikan; chart kompleks dimuat ketika diperlukan; table besar perlu profiling sebelum memilih virtualization yang memengaruhi accessibility. Jangan menambah akun, notification service, trading execution atau live feed demi style proposal.

## 24. Riset referensi dan batasnya

Ini riset dokumentasi primer dan source lokal, bukan audit visual/login lengkap terhadap semua produk. Prinsip adaptasi berikut merupakan inferensi desain untuk RadarX, bukan klaim superioritas atau feature parity.

| Sumber primer | Yang dipelajari | Adaptasi yang disarankan |
|---|---|---|
| [Koyfin My Dashboards](https://www.koyfin.com/help/mydashboards-myd/) | Table/watchlist dan chart widgets dengan view/columns | Ranking dan evidence terhubung; custom-layout builder tidak diperlukan untuk MVP |
| [Koyfin navigation](https://www.koyfin.com/help/release-notes/customizable-left-navigation/amp/) | Sections dan akses tools yang dapat diatur | Prioritaskan task utama; tidak meniru semua fungsi/personalization |
| [TradingView multiple-chart layout](https://tradingview.com/charting-library-docs/latest/trading_terminal/multiple-chart-layout/) | Perbandingan dengan ticker/time/crosshair synchronization | Aligned windows/series membantu membaca konteks; tidak mengasumsikan SDK/license integration |
| [Quiver institutional holdings](https://www.quiverquant.com/sec13f/) | Reported holdings, filing context dan fund-oriented browsing | Holder-first research serta publication date dekat angka |
| [Simply Wall St visual assessment](https://support.simplywall.st/hc/en-us/articles/360001740916-How-does-the-Snowflake-work) | Summary visual memiliki dimensions yang didefinisikan | Signature visual harus punya metode/drilldown; tidak meniru snowflake atau membuat coverage palsu |
| [Stockbit Broker Flow](https://help.stockbit.com/id/article/broker-flow-bagaimana-cara-menggunakan-dan-apa-fungsinya-vbvjo1/) | Dokumentasi broker flow dengan ekspektasi intraday | RadarX menampilkan date/EOD/snapshot jelas agar ekspektasi tidak keliru |
| [AlphaSense document review](https://help.alpha-sense.com/hc/en-us/articles/52886436185363-Reviewing-Documents-in-AlphaSense) | Result/document context dan pembacaan sumber | Original source tersedia dari observation, bukan hanya methodology footer |

Sumber lokal lain: [DESIGN_SPEC](../../specs/DESIGN_SPEC.md), [DESIGN_SPEC_V3](../../specs/DESIGN_SPEC_V3.md), [DataStatus](../../src/components/DataStatus.tsx), [TimelineChart](../../src/components/TimelineChart.tsx), [SearchBox](../../src/components/SearchBox.tsx), [MobileNav](../../src/components/MobileNav.tsx). Current source mengalahkan narasi lama; status sumber finansial tidak divalidasi ulang sebagai bagian riset visual.

Hindsight digunakan sebagai locator/konteks, kemudian dicocokkan dengan repo. Sebagian halaman mencampurkan bot/backtest proyek lama, sehingga klaim operasional itu tidak dipakai. Retrieval pada lanjutan mengalami transport error; ini tidak mengubah source lokal menjadi bukti runtime.

## 25. Skill yang digunakan dan keputusan konflik

| Skill / referensi | Penerapan pada artifact |
|---|---|
| brainstorming | Membingkai alternatif dan tradeoff; tidak memulai implementasi sebelum pemilihan |
| brandkit | Lima dunia coherent sebelum logo/palette; strategi dan motif, tanpa image board/aset final |
| antislop core + UI/copywriting/human/mobile | During-drafting, honest content, purpose, state/contrast/mobile contracts; final gate oleh root |
| impeccable context + shape/operate guidance | Memeriksa konteks repo; proposal tidak dijadikan root DESIGN.md atau selected implementation |
| ui-ux-pro-max | Query design system melalui script lokal; table/filter/focus guidance dipakai |
| better-interface + writing/typography/colors/accessibility/layout | Kamus, role font, token meaning, reading order, keyboard dan source access |
| emilkowalski-motion guidance | Kisaran/control-state motion sebagai proposal; tidak mengklaim tuning motion pada UI nyata |
| diagram-design / baoyu-design / redesign-existing-projects | Menilai kecocokan komposisi, legend dan presentation; tidak menghasilkan diagram/HTML atau menerapkan redesign aplikasi |

Query UI Pro Max diulang sekali dengan istilah financial dashboard. Output Enterprise Gateway, Contact Sales, client-logo carousel, forced dark OLED, Fira Code headings dan scroll-reveal tidak cocok dengan brief ini dan tidak diadopsi. Saran membuat angka/nama/avatars realistis dari panduan redesign ditolak karena bertentangan dengan antislop/evidence contract. Semua choices masih proposed; brandkit tidak berarti logo generated. Tidak mengklaim semua skill kreatif tersedia telah dijalankan bila tidak relevan.

## 26. Antislop delivery gate: artifact Markdown

Root menilai empat blok di bawah. **PASS berarti pemeriksaan dokumen/proposal**, bukan aplikasi baru lulus runtime. Checks yang memerlukan rendered UI tercatat N/A, dengan persyaratan di bagian 23. Tidak ada HTML preview, logo final, atau app build yang diserahkan.

### Block 1: Hard gate

| Item | Hasil / bukti |
|---|---|
| R-02 punctuation | PASS: copy baru tidak menggunakan em dash; scan karakter dokumen |
| R-03 mobile | PASS proposal: empat pola dan checkpoint ada di §18; rendered overflow N/A |
| R-17 facts/stats | PASS: fakta produk dirujuk ke README/source; nilai contrast dihitung; sizes/timing berlabel usulan |
| R-18 testimonials | PASS: tidak ada testimonial/persona bernama yang dikarang |
| R-23 assets/navigation | PASS: konsep logo jelas proposed; tidak ada asset final; current/planned routes dibedakan |
| R-24 links | PASS artifact: local references diperiksa; planned menu bukan link app aktif; click-through app N/A |
| R-25 contrast | PASS pairs: 50 rasio brand memenuhi ambang dengan nilai unrounded; runtime states N/A |
| R-26 controls | PASS proposal: tindakan berlabel dan behavior disebut; artifact tidak memiliki kontrol aplikasi |
| R-27 states | PASS: loading, empty, error, partial, missing, stale dan outcome states tertulis di §19 |
| R-28 FAQ | PASS: tidak ada FAQ pengisi template |
| R-32 keyboard | PASS proposal: native table/combobox, focus, Escape, skip link dan equivalent chart table disyaratkan; runtime N/A |
| R-33 source patching | PASS: hanya file baru dokumen ditulis dengan patch; source/CSS tidak diubah |
| R-34 themes | PASS tokens: semua lima palet memiliki light/dark; rendered theme sweep N/A |
| R-35 inspection | PASS artifact: dokumen, links lokal, IDs/counts, token ratios dan kontradiksi diperiksa; tidak mengklaim app dijalankan |
| R-36 trust claims | PASS: tidak ada klaim security/compliance/customer/performance buatan |
| R-37 direction | PASS: proposal awaiting choice, lima world/dials eksplisit; bukan direction yang dianggap disetujui |
| R-38 fabricated content | PASS: tidak ada financial values, fake product shots, fictional team atau ghost features sebagai current capability |

### Block 2: Purpose gate

| Item | Hasil / bukti |
|---|---|
| R-01 gradient | PASS: palet solid, tidak ada gradient default |
| R-04 icons | PASS: semantic action icons saja, label penting tetap ada; tidak ada icon set/aset final |
| R-06 typography | PASS: F1–F5 menjelaskan brand/role; mono untuk data/IDs, bukan terminal hero |
| R-07 grid | PASS: tidak ada decorative background grid |
| R-08 arrows | PASS: CTA berupa verb spesifik; tidak dibubuhi decorative arrows |
| R-09 badges | PASS: badge hanya untuk faktual state dengan definisi |
| R-10 glass | PASS: tidak ada glassmorphism default |
| R-12 shadows | PASS: shadow menandai overlay, data surface datar |
| R-13 glow | PASS: tidak ada glow default |
| R-14 cards | PASS: board/ledger/sector/comparison berbeda menurut tugas, bukan uniform cards |
| R-19 motion | PASS: M1–M4 menyebut trigger, purpose dan reduced behavior |
| R-22 illustration | PASS: tidak ada generic illustration/product shot buatan |

### Block 3: Liveliness

| Item | Hasil / bukti |
|---|---|
| Explicit dials | PASS: setiap world memiliki ENERGY/RHYTHM/MOTION di §4 |
| Dial consistency | PASS proposal: low-motion, differentiated compositions sesuai dunia; rendered impression N/A |
| Focal point | PASS: issuer list, ledger, sector atau comparison menjadi fokus DASH-A–D |
| Structural whitespace | PASS: spacing membedakan field/group/report section di §11 |
| Deliberate accent | PASS: satu brand accent per world; data colors diberi role terpisah |
| Identity motif | PASS: window/source/zero baseline/relationship motif beralasan di §4/21 |
| Design Read | PASS: user tasks, baseline, facts/plans dan character dideklarasikan di §2 |

### Block 4: Craftsmanship dan quality locks

| Item | Hasil / bukti |
|---|---|
| C-1 intentionality | PASS: tiap alternatif memiliki alasan dan tradeoff |
| C-2 completeness | PASS artifact: semua kategori pilihan terisi; interactive behavior dinyatakan, tidak ada app control palsu |
| C-3 content | PASS: kategori mendukung riset IDX dan pilihan owner, bukan sections marketing pengisi |
| C-4 resilience | PASS proposal: themes/states/mobile/keyboard contracts lengkap; runtime N/A |
| C-5 evidence | PASS: source/calc dan proposed judgments dibedakan |
| R-05 composition | PASS: empat dashboard dan entry options tidak dipaksa hero/bento/template |
| R-11 radius | PASS: kontrol, panel, source block dan overlay dibedakan |
| R-15 CTA | PASS: Open board, Read source, Clear filters dan Review observations adalah tindakan spesifik |
| R-16 buzzwords | PASS: tidak ada janji marketing AI/revolution/performance |
| R-20 identity | PASS proposal: boundaries, source-linked readings dan filing dates menjadi motif konten khas |
| R-21 dark default | PASS: TH1–TH3 punya alasan dan light/dark lengkap, tidak memaksakan dark karena terlihat tech |
| R-29 palette | PASS: neutral + satu accent; signed-flow/cohort/error/unknown didefinisikan terpisah |
| R-30 originality | PASS proposal: referensi diadaptasi sebagai prinsip, bukan cloned screenshots atau palette |
| R-31 reasons | PASS: alasan keputusan major tercatat pada world/category tables |

**Status akhir:** proposal desain lengkap untuk dipilih; implementasi/rebrand belum dimulai. Rekomendasi owner-review: PK1, atau PK2 bila ingin karakter laporan lebih kuat.

### Receipt verifikasi artifact

Root menjalankan pemeriksaan read-only pada file final: 21 kelompok ID berisi 3–5 alternatif sesuai count yang ditetapkan; lima dunia A–E memiliki masing-masing 10 token light/dark; 50 rasio brand dihitung ulang dari hex dalam Markdown dan cocok dengan tabel hingga tiga desimal; semua 12 referensi lokal ada; package IDs valid; code fences seimbang; scan em dash dan placeholder kosong. Hasil command Python: PASS, exit 0. Score contract juga dicocokkan kembali dengan `src/lib/score.ts` dan methodology source. Referensi kompetitor dibuka melalui web research primer.

Peer review tambahan pada draft tidak selesai karena limit layanan agent. Root menyelesaikan pemeriksaan dokumen dan delivery gate sendiri. Tidak ada app runtime, build, screenshot, click-through, atau sertifikasi WCAG yang diklaim dari receipt ini.
