// Shared helpers for the server-rendered SVG charts. Colours are the app's semantic tokens, so dark mode follows the toggle.
// Taken (green) and missed (red) sit at nearly the same lightness, so a chart that separates them also
// gets a 45° hatch on one series; identity is never colour alone (legend words, hatch, tooltips, data table).

export const CHART_COLORS = {
  primary: "var(--primary)",
  taken: "var(--taken-fg)",
  missed: "var(--missed-fg)",
  muted: "var(--fg-muted)",
} as const;

export const AXIS_TEXT = "var(--fg-muted)";
export const GRID = "var(--border)";

// Shared viewBox width. The SVG scales with its container but never below MIN_WIDTH so tick text stays readable;
// narrower screens scroll inside the chart's own container.
export const VIEW_WIDTH = 560;
export const SVG_CLASS = "block h-auto w-full min-w-[28rem]";

export interface Scale {
  max: number;
  ticks: number[];
}

// "Nice" axis maximum and ticks for non-negative data (about `target` intervals, whole steps for counts).
export function niceScale(dataMax: number, target = 4): Scale {
  if (!(dataMax > 0)) return { max: 1, ticks: [0, 1] };
  const raw = dataMax / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow);
  const max = Math.ceil(dataMax / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { max, ticks };
}

// Splits a long axis label into at most two lines near `maxChars`; the second line is cut with an ellipsis.
export function wrapLabel(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  let first = "";
  while (words.length && (first + " " + words[0]).trim().length <= maxChars) first = (first + " " + words.shift()).trim();
  if (!first) return [text.slice(0, maxChars - 1) + "…"];
  const rest = words.join(" ");
  return [first, rest.length > maxChars ? rest.slice(0, maxChars - 1) + "…" : rest];
}

export const fmtInt = (n: number) => n.toLocaleString("en-IN");

// Pattern definition for a hatched series (45° stripes over a light wash of the series colour).
export function HatchPattern({ id, color }: { id: string; color: string }) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill={color} fillOpacity="0.28" />
      <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="3" />
    </pattern>
  );
}

export function SeriesSwatch({ id, color, hatched }: { id: string; color: string; hatched?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      {hatched && (
        <defs>
          <HatchPattern id={id} color={color} />
        </defs>
      )}
      <rect width="16" height="16" rx="3" fill={hatched ? `url(#${id})` : color} />
    </svg>
  );
}
