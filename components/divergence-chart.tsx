"use client";

import { useElementWidth } from "@/hooks/use-element-width";

export interface ChartPanel {
  title: string;
  unit: string;
  color: string;
  values: (number | null)[];
  format: (value: number) => string;
  kind: "bars" | "line";
}

interface DivergenceChartProps {
  months: string[];
  panels: readonly [ChartPanel, ChartPanel];
  activeIndex: number;
  onScrub: (index: number) => void;
}

const LEFT = 52;
const RIGHT = 10;
const TITLE_H = 20;
const PLOT_H = 128;
const GAP = 28;
const AXIS_H = 20;
const HEIGHT = 2 * (TITLE_H + PLOT_H) + GAP + AXIS_H;

/** A round number at or above the peak, so the axis label reads cleanly. */
function niceMax(values: (number | null)[]): number {
  const peak = Math.max(0, ...values.filter((v): v is number => v !== null));
  if (peak === 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  return Math.ceil(peak / (magnitude / 2)) * (magnitude / 2);
}

function Panel({
  panel,
  months,
  activeIndex,
  top,
  width,
}: {
  panel: ChartPanel;
  months: string[];
  activeIndex: number;
  top: number;
  width: number;
}) {
  const plotTop = top + TITLE_H;
  const plotWidth = width - LEFT - RIGHT;
  const band = plotWidth / months.length;
  const max = niceMax(panel.values);
  const y = (value: number) => plotTop + PLOT_H - (value / max) * PLOT_H;
  const centre = (index: number) => LEFT + (index + 0.5) * band;
  const reported = panel.values.some((value) => value !== null);

  // One unbroken polyline per run of reported months: a country GDELT has
  // nothing for should read as a gap, not as a line drawn through zero.
  const runs: string[] = [];
  let run: string[] = [];
  panel.values.forEach((value, index) => {
    if (value === null) {
      if (run.length > 1) runs.push(run.join(" "));
      run = [];
      return;
    }
    run.push(`${centre(index).toFixed(1)},${y(value).toFixed(1)}`);
  });
  if (run.length > 1) runs.push(run.join(" "));

  const active = panel.values[activeIndex] ?? null;

  return (
    <g>
      <text className="fill-ink text-[13px] font-semibold" x={LEFT} y={top + 6}>
        {panel.title}
        {/* The unit is the first thing to go when there is no room for it; the
            readout above the chart carries the same information. */}
        {width >= 640 && (
          <tspan className="fill-ink/55 text-[11px] font-normal" dx="8">
            {panel.unit}
          </tspan>
        )}
      </text>

      {[0, 0.5, 1].map((fraction) => (
        <g key={fraction}>
          <line
            className="stroke-ink/12"
            strokeWidth={1}
            x1={LEFT}
            x2={width - RIGHT}
            y1={y(max * fraction)}
            y2={y(max * fraction)}
          />
          <text
            className="fill-ink/50 text-[10px]"
            textAnchor="end"
            x={LEFT - 8}
            y={y(max * fraction) + 3}
          >
            {panel.format(max * fraction)}
          </text>
        </g>
      ))}

      {!reported && (
        <text
          className="fill-ink/45 text-[12px] italic"
          x={LEFT + plotWidth / 2}
          textAnchor="middle"
          y={plotTop + PLOT_H / 2}
        >
          Not reported
        </text>
      )}

      {panel.kind === "bars"
        ? panel.values.map((value, index) =>
            value === null ? null : (
              <rect
                fill={panel.color}
                height={Math.max(1, plotTop + PLOT_H - y(value))}
                key={index}
                opacity={index === activeIndex ? 1 : 0.78}
                rx={Math.min(2, Math.max(0, band - 2) / 2)}
                width={Math.max(1, band - 2)}
                x={LEFT + index * band + 1}
                y={y(value)}
              />
            ),
          )
        : runs.map((points, index) => (
            <polyline
              fill="none"
              key={index}
              points={points}
              stroke={panel.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          ))}

      <line
        className="stroke-ink/35"
        strokeWidth={1}
        x1={centre(activeIndex)}
        x2={centre(activeIndex)}
        y1={plotTop}
        y2={plotTop + PLOT_H}
      />
      {active !== null && panel.kind === "line" && (
        <circle
          className="stroke-paper"
          cx={centre(activeIndex)}
          cy={y(active)}
          fill={panel.color}
          r={4}
          strokeWidth={2}
        />
      )}
      <line
        className="stroke-ink/25"
        strokeWidth={1}
        x1={LEFT}
        x2={width - RIGHT}
        y1={plotTop + PLOT_H}
        y2={plotTop + PLOT_H}
      />
    </g>
  );
}

/**
 * Two panels, one x-axis, one scrub line through both. Deliberately not a
 * dual-axis chart: applications and news share are different quantities, and
 * overlaying them on one scale would invent a correlation the data does not
 * contain. Reading them as two rows leaves the divergence to the eye.
 */
export function DivergenceChart({
  months,
  panels,
  activeIndex,
  onScrub,
}: DivergenceChartProps) {
  const [measure, width] = useElementWidth();

  const band = (width - LEFT - RIGHT) / months.length;
  // Measured off the <svg> the pointer is actually on, which is the element
  // the geometry below is expressed in.
  const indexAt = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - box.left - LEFT) / band);
    return Math.min(months.length - 1, Math.max(0, index));
  };

  const years = months
    .map((month, index) => ({ year: month.slice(0, 4), month, index }))
    .filter((entry) => entry.month.endsWith("-01"));

  return (
    <div className="w-full" ref={measure}>
      {width > 0 && (
        <svg
          aria-label="Asylum applications and news coverage by month"
          height={HEIGHT}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            onScrub(indexAt(event));
          }}
          onPointerMove={(event) => {
            if (event.buttons || event.pointerType === "mouse") {
              onScrub(indexAt(event));
            }
          }}
          role="slider"
          aria-valuemax={months.length - 1}
          aria-valuemin={0}
          aria-valuenow={activeIndex}
          aria-valuetext={months[activeIndex]}
          onKeyDown={(event) => {
            const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
            if (!step) return;
            event.preventDefault();
            onScrub(Math.min(months.length - 1, Math.max(0, activeIndex + step)));
          }}
          tabIndex={0}
          className="touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-signal"
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
        >
          <Panel
            activeIndex={activeIndex}
            months={months}
            panel={panels[0]}
            top={0}
            width={width}
          />
          <Panel
            activeIndex={activeIndex}
            months={months}
            panel={panels[1]}
            top={TITLE_H + PLOT_H + GAP}
            width={width}
          />
          {years.map(({ year, index }) => (
            <text
              className="fill-ink/50 text-[10px]"
              key={year}
              textAnchor="middle"
              x={LEFT + (index + 0.5) * band}
              y={HEIGHT - 6}
            >
              {band * 12 > 34 ? year : year.slice(2)}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
