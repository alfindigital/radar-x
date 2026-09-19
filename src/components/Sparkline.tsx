// Inline SVG sparkline — cumulative or raw series, Fey-style thin stroke.

export default function Sparkline({
  values,
  width = 96,
  height = 28,
  cumulative = false,
}: {
  values: number[];
  width?: number;
  height?: number;
  cumulative?: boolean;
}) {
  if (values.length < 2) {
    return <span className="faint inline-block text-center text-[10px]" style={{ width }}>—</span>;
  }

  const series = cumulative ? cumulate(values) : values;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pad = 2;

  const pts = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const up = series[series.length - 1] >= series[0];
  const color = up ? "var(--acc)" : "var(--dist)";
  const [lastX, lastY] = pts[pts.length - 1];
  const zeroY = min < 0 && max > 0 ? pad + (1 - (0 - min) / span) * (height - pad * 2) : null;

  return (
    <svg width={width} height={height} className="block" aria-hidden>
      {zeroY !== null && (
        <line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke="var(--line-2)" strokeWidth="1" strokeDasharray="2 3" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

function cumulate(v: number[]) {
  let s = 0;
  return v.map((x) => (s += x));
}
