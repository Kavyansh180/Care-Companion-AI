import { cardClass } from "@/components/ui/styles";
import { SeriesSwatch } from "./chart-utils";

export interface ChartTable {
  columns: string[];
  rows: Array<Array<string | number>>; // first cell of each row is the row header
}

export interface LegendItem {
  label: string;
  color: string;
  hatched?: boolean;
}

// Frame shared by every chart: heading, caption (time range, units, source), legend for 2+ series,
// the chart itself, and a real table of the same values.
export default function ChartFigure({
  id,
  title,
  caption,
  legend,
  table,
  children,
}: {
  id: string;
  title: string;
  caption: string;
  legend?: LegendItem[];
  table: ChartTable;
  children: React.ReactNode;
}) {
  return (
    <figure className={`${cardClass} min-w-0`}>
      <figcaption>
        <h3 className="text-lg font-semibold text-fg">{title}</h3>
        <p className="mt-1 text-sm text-fg-muted">{caption}</p>
      </figcaption>

      {legend && legend.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg" aria-label="Legend">
          {legend.map((item, i) => (
            <li key={item.label} className="inline-flex items-center gap-2">
              <SeriesSwatch id={`${id}-legend-${i}`} color={item.color} hatched={item.hatched} />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      {/* Scrolls sideways inside the card on narrow screens instead of shrinking the text. */}
      <div
        className="mt-3 overflow-x-auto"
        role="region"
        aria-label={`${title}: chart, scrolls sideways on small screens`}
        tabIndex={0}
      >
        {children}
      </div>

      <details className="mt-3 border-t border-border pt-3">
        <summary className="cursor-pointer text-base font-semibold text-primary-text">Show data table</summary>
        <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-border" role="region" aria-label={`${title}: data table`} tabIndex={0}>
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-surface-muted text-fg">
              <tr>
                {table.columns.map((c) => (
                  <th key={c} scope="col" className="px-3 py-2 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {table.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row" className="px-3 py-1.5 font-medium whitespace-nowrap text-fg">
                        {cell}
                      </th>
                    ) : (
                      <td key={i} className="px-3 py-1.5 tabular-nums text-fg">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
