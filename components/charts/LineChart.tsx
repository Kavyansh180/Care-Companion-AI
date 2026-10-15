import { AXIS_TEXT, CHART_COLORS, GRID, SVG_CLASS, VIEW_WIDTH, niceScale } from "./chart-utils";

export interface LinePoint {
  label: string; // x tick text, e.g. "16 Sep"
  value: number | null; // null = no data; the line breaks there
  tooltip: string; // full sentence shown by the native <title> tooltip
}

const HEIGHT = 300;
const M = { top: 20, right: 54, bottom: 62, left: 64 };

// Single-series line chart: 2px line, 4px markers with a 2px surface ring, hairline grid, one labelled end value.
export default function LineChart({
  ariaLabel,
  points,
  yMax,
  yTicks,
  xAxisLabel,
  yAxisLabel,
  formatValue,
  color = CHART_COLORS.primary,
  tickEvery = 5,
}: {
  ariaLabel: string;
  points: LinePoint[];
  yMax?: number; // fixed axis maximum (e.g. 100 for percentages); otherwise derived from the data
  yTicks?: number[];
  xAxisLabel: string;
  yAxisLabel: string;
  formatValue: (n: number) => string;
  color?: string;
  tickEvery?: number;
}) {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  const scale = yMax !== undefined ? { max: yMax, ticks: yTicks ?? niceScale(yMax).ticks } : niceScale(Math.max(0, ...values));
  const plotW = VIEW_WIDTH - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const x = (i: number) => M.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => M.top + plotH - (v / scale.max) * plotH;

  // Break the path wherever a value is missing so a gap is never drawn as a trend.
  const segments: string[] = [];
  let current = "";
  points.forEach((p, i) => {
    if (p.value === null) {
      if (current) segments.push(current);
      current = "";
    } else {
      current += `${current ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
    }
  });
  if (current) segments.push(current);

  let last = -1;
  points.forEach((p, i) => {
    if (p.value !== null) last = i;
  });

  return (
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${HEIGHT}`} role="img" aria-label={ariaLabel} className={SVG_CLASS} fontSize="13">
      {scale.ticks.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={VIEW_WIDTH - M.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
          <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fill={AXIS_TEXT} className="tabular-nums">
            {formatValue(t)}
          </text>
        </g>
      ))}

      {points.map((p, i) =>
        i % tickEvery === 0 || i === points.length - 1 ? (
          <text key={p.label + i} x={x(i)} y={M.top + plotH + 20} textAnchor="middle" fill={AXIS_TEXT}>
            {p.label}
          </text>
        ) : null,
      )}

      <text x={M.left + plotW / 2} y={HEIGHT - 8} textAnchor="middle" fill={AXIS_TEXT} fontSize="14">
        {xAxisLabel}
      </text>
      <text transform={`translate(16 ${M.top + plotH / 2}) rotate(-90)`} textAnchor="middle" fill={AXIS_TEXT} fontSize="14">
        {yAxisLabel}
      </text>

      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      ))}

      {points.map((p, i) =>
        p.value === null ? null : (
          <g key={p.label + i}>
            <title>{p.tooltip}</title>
            {/* larger invisible target so the tooltip is easy to reach */}
            <circle cx={x(i)} cy={y(p.value)} r="9" fill="transparent" />
            <circle cx={x(i)} cy={y(p.value)} r="4" fill={color} stroke="var(--surface)" strokeWidth="2" />
          </g>
        ),
      )}

      {last >= 0 && (
        <text x={x(last) + 10} y={y(points[last].value as number)} textAnchor="start" dominantBaseline="middle" fill="var(--fg)" fontWeight="600">
          {formatValue(points[last].value as number)}
        </text>
      )}
    </svg>
  );
}
