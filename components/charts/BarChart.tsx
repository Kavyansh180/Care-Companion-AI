import { AXIS_TEXT, GRID, HatchPattern, SVG_CLASS, VIEW_WIDTH, niceScale, wrapLabel } from "./chart-utils";

export interface BarSeries {
  name: string;
  color: string;
  hatched?: boolean;
  values: Array<number | null>; // one per category; null/0 draws nothing (the data table still lists it)
}

const GAP = 2; // surface-coloured gap between touching fills
const RADIUS = 4; // rounded data end, square at the baseline

// Bars grow from a single baseline; a stack rounds only its last segment. Vertical = columns, horizontal = bars.
export default function BarChart({
  id,
  ariaLabel,
  categories,
  series,
  mode = "grouped",
  orientation = "vertical",
  yMax,
  yTicks,
  categoryAxisLabel,
  valueAxisLabel,
  formatValue,
  tooltip,
  valueLabels = false,
  tickEvery = 1,
  maxBar = 24,
  wrapAt = 22,
}: {
  id: string;
  ariaLabel: string;
  categories: string[];
  series: BarSeries[];
  mode?: "grouped" | "stacked";
  orientation?: "vertical" | "horizontal";
  yMax?: number; // fixed value-axis maximum (e.g. 100 for percentages); otherwise derived from the data
  yTicks?: number[];
  categoryAxisLabel: string;
  valueAxisLabel: string;
  formatValue: (n: number) => string;
  tooltip: (categoryIndex: number, seriesIndex: number) => string;
  valueLabels?: boolean; // value at the bar tip; only for charts with few bars
  tickEvery?: number; // show every n-th category label (dense daily charts)
  maxBar?: number;
  wrapAt?: number;
}) {
  const vertical = orientation === "vertical";
  const n = series.length;
  const num = (s: number, c: number) => series[s].values[c] ?? 0;

  const dataMax = Math.max(
    0,
    ...categories.map((_, c) => (mode === "stacked" ? series.reduce((sum, _s, s) => sum + num(s, c), 0) : Math.max(0, ...series.map((_s, s) => num(s, c))))),
  );
  const scale = yMax !== undefined ? { max: yMax, ticks: yTicks ?? niceScale(yMax).ticks } : niceScale(dataMax);

  const wrapped = categories.map((c) => wrapLabel(c, wrapAt));
  const twoLines = wrapped.some((l) => l.length > 1);
  const M = vertical
    ? { top: 22, right: 16, bottom: 62 + (twoLines ? 16 : 0), left: 64 }
    : { top: 12, right: 56, bottom: 56, left: 224 };
  const band = vertical ? (VIEW_WIDTH - M.left - M.right) / categories.length : mode === "stacked" || n === 1 ? 36 : 28 * n + 8;
  const plotW = VIEW_WIDTH - M.left - M.right;
  const plotH = vertical ? 216 : band * categories.length;
  const height = M.top + plotH + M.bottom;
  const base = vertical ? M.top + plotH : M.left;
  const pos = (v: number) => (vertical ? M.top + plotH - (v / scale.max) * plotH : M.left + (v / scale.max) * plotW);

  // Path for one bar from `from` to `to` along the value axis, `t` thick at cross-axis offset `at`.
  const shape = (at: number, t: number, from: number, to: number, round: boolean) => {
    const r = round ? Math.min(RADIUS, t / 2, Math.abs(to - from)) : 0;
    return vertical
      ? `M${at},${from}V${to + r}Q${at},${to} ${at + r},${to}H${at + t - r}Q${at + t},${to} ${at + t},${to + r}V${from}Z`
      : `M${from},${at}H${to - r}Q${to},${at} ${to},${at + r}V${at + t - r}Q${to},${at + t} ${to - r},${at + t}H${from}Z`;
  };

  const marks: Array<{ key: string; d: string; fill: string; title: string; label?: { x: number; y: number; text: string } }> = [];
  categories.forEach((_, c) => {
    const start = (vertical ? M.left : M.top) + c * band;
    if (mode === "stacked") {
      const t = Math.min(maxBar, band * 0.7);
      const at = start + (band - t) / 2;
      const lastFilled = series.reduce((last, _s, s) => (num(s, c) > 0 ? s : last), -1);
      let cum = 0;
      let firstDone = false;
      series.forEach((s, si) => {
        const v = num(si, c);
        if (v <= 0) return;
        const inset = firstDone ? GAP : 0; // gap sits on the baseline side of every segment after the first
        const from = pos(cum) + (vertical ? -inset : inset);
        const to = pos(cum + v);
        cum += v;
        firstDone = true;
        if (Math.abs(to - from) < 0.5) return;
        marks.push({ key: `${c}-${si}`, d: shape(at, t, from, to, si === lastFilled), fill: s.hatched ? `url(#${id}-hatch-${si})` : s.color, title: tooltip(c, si) });
      });
    } else {
      const t = Math.min(maxBar, (band * 0.78 - (n - 1) * GAP) / n);
      const at0 = start + (band - (n * t + (n - 1) * GAP)) / 2;
      series.forEach((s, si) => {
        const raw = s.values[c];
        if (raw === null || raw === undefined || raw <= 0) return;
        const to = pos(raw);
        const at = at0 + si * (t + GAP);
        marks.push({
          key: `${c}-${si}`,
          d: shape(at, t, base, to, true),
          fill: s.hatched ? `url(#${id}-hatch-${si})` : s.color,
          title: tooltip(c, si),
          label: valueLabels ? (vertical ? { x: at + t / 2, y: to - 6, text: formatValue(raw) } : { x: to + 6, y: at + t / 2, text: formatValue(raw) }) : undefined,
        });
      });
    }
  });

  return (
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${height}`} role="img" aria-label={ariaLabel} className={SVG_CLASS} fontSize="13">
      <defs>
        {series.map((s, si) => (s.hatched ? <HatchPattern key={si} id={`${id}-hatch-${si}`} color={s.color} /> : null))}
      </defs>

      {scale.ticks.map((t) => (
        <g key={t}>
          {vertical ? (
            <>
              <line x1={M.left} x2={VIEW_WIDTH - M.right} y1={pos(t)} y2={pos(t)} stroke={GRID} strokeWidth="1" />
              <text x={M.left - 8} y={pos(t)} textAnchor="end" dominantBaseline="middle" fill={AXIS_TEXT} className="tabular-nums">
                {formatValue(t)}
              </text>
            </>
          ) : (
            <>
              <line x1={pos(t)} x2={pos(t)} y1={M.top} y2={M.top + plotH} stroke={GRID} strokeWidth="1" />
              <text x={pos(t)} y={M.top + plotH + 18} textAnchor="middle" fill={AXIS_TEXT} className="tabular-nums">
                {formatValue(t)}
              </text>
            </>
          )}
        </g>
      ))}

      {categories.map((c, i) => {
        if (vertical) {
          if (i % tickEvery !== 0 && i !== categories.length - 1) return null;
          const cx = M.left + (i + 0.5) * band;
          return (
            <text key={c + i} textAnchor="middle" fill={AXIS_TEXT}>
              {wrapped[i].map((line, li) => (
                <tspan key={li} x={cx} y={M.top + plotH + 20 + li * 16}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        }
        const cy = M.top + (i + 0.5) * band;
        const lines = wrapped[i];
        return (
          <text key={c + i} textAnchor="end" fill={AXIS_TEXT}>
            {lines.map((line, li) => (
              <tspan key={li} x={M.left - 10} y={cy + (li - (lines.length - 1) / 2) * 16} dominantBaseline="middle">
                {line}
              </tspan>
            ))}
          </text>
        );
      })}

      {/* baseline */}
      {vertical ? (
        <line x1={M.left} x2={VIEW_WIDTH - M.right} y1={base} y2={base} stroke={GRID} strokeWidth="1" />
      ) : (
        <line x1={base} x2={base} y1={M.top} y2={M.top + plotH} stroke={GRID} strokeWidth="1" />
      )}

      {vertical ? (
        <>
          <text x={M.left + plotW / 2} y={height - 8} textAnchor="middle" fill={AXIS_TEXT} fontSize="14">
            {categoryAxisLabel}
          </text>
          <text transform={`translate(16 ${M.top + plotH / 2}) rotate(-90)`} textAnchor="middle" fill={AXIS_TEXT} fontSize="14">
            {valueAxisLabel}
          </text>
        </>
      ) : (
        <>
          <text x={M.left + plotW / 2} y={height - 8} textAnchor="middle" fill={AXIS_TEXT} fontSize="14">
            {valueAxisLabel}
          </text>
          <text transform={`translate(14 ${M.top + plotH / 2}) rotate(-90)`} textAnchor="middle" fill={AXIS_TEXT} fontSize="14">
            {categoryAxisLabel}
          </text>
        </>
      )}

      {marks.map((m) => (
        <g key={m.key}>
          <title>{m.title}</title>
          <path d={m.d} fill={m.fill} />
          {m.label && (
            <text x={m.label.x} y={m.label.y} textAnchor={vertical ? "middle" : "start"} dominantBaseline={vertical ? undefined : "middle"} fill="var(--fg)" fontWeight="600" className="tabular-nums">
              {m.label.text}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
