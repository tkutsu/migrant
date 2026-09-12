"use client";

import { useMemo, useState } from "react";
import { CountryRanking } from "@/components/country-ranking";
import { DivergenceChart, type ChartPanel } from "@/components/divergence-chart";
import { ThemeToggle } from "@/components/theme-toggle";
import { useMigrationData } from "@/hooks/use-migration-data";
import { countryFlag, formatCount, formatMonth, formatRate, formatShare } from "@/lib/format";
import { lastComplete, measured } from "@/lib/series";
import type { CountrySeries, Measure } from "@/lib/types";

const MEASURES: { id: Measure; label: string }[] = [
  { id: "absolute", label: "Total" },
  { id: "per-capita", label: "Per 100,000 people" },
];

function Stat({
  color,
  label,
  value,
  note,
}: {
  color: string;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-1.5 text-[11px] tracking-wide text-ink/55 uppercase">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </div>
      <div className="mt-0.5 text-2xl tabular-nums">{value}</div>
      <div className="text-[11px] text-ink/55">{note}</div>
    </div>
  );
}

export function MigrantApp() {
  const { data, error } = useMigrationData();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [measure, setMeasure] = useState<Measure>("absolute");
  const [monthIndex, setMonthIndex] = useState<number | null>(null);

  const selected: CountrySeries | null = useMemo(() => {
    if (!data) return null;
    if (!selectedCode) return data.europe;
    return (
      data.countries.find((country) => country.code === selectedCode) ?? data.europe
    );
  }, [data, selectedCode]);

  const index = useMemo(() => {
    if (!data || !selected) return 0;
    const fallback = lastComplete(data.europe);
    return Math.min(data.months.length - 1, monthIndex ?? fallback);
  }, [data, monthIndex, selected]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-ink/70">
          The dataset could not be loaded. It is a single file at{" "}
          <code>data/migration.json</code>; if this persists the last build
          probably failed.
        </p>
      </main>
    );
  }

  if (!data || !selected) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-ink/55">Loading…</p>
      </main>
    );
  }

  const applications = measured(selected, measure);
  const perCapitaUnavailable = measure === "per-capita" && !selected.population;
  const applicationValue = applications[index];
  const coverageValue = selected.coverage[index];

  const panels: readonly [ChartPanel, ChartPanel] = [
    {
      title: "Asylum applications",
      unit:
        measure === "absolute"
          ? "lodged that month"
          : `per 100,000 residents (${selected.populationYear ?? "—"} population)`,
      color: `var(--applications)`,
      values: applications,
      format: measure === "absolute" ? formatCount : formatRate,
      kind: "bars",
    },
    {
      title: "News about migration",
      unit: "share of that country's monitored coverage",
      color: `var(--coverage)`,
      values: selected.coverage,
      format: (value) => `${value.toFixed(2)}%`,
      kind: "line",
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold">Reality and coverage</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-ink/65">
            Monthly asylum applications across Europe, shown beside how much of
            each country&rsquo;s news was about migration. The two rows share a
            month axis and nothing else &mdash; drag across them to move through{" "}
            {data.months[0].slice(0, 4)}&ndash;
            {data.months[data.months.length - 1].slice(0, 4)}.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="text-[12px] text-ink/60">
          Country{" "}
          <select
            className="rounded border border-ink/15 bg-transparent px-2 py-1 text-[13px] text-ink"
            onChange={(event) => setSelectedCode(event.target.value)}
            value={selected.code}
          >
            <option value={data.europe.code}>
              {countryFlag(data.europe.iso2)} {data.europe.name}
            </option>
            {[...data.countries]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((country) => (
                <option key={country.code} value={country.code}>
                  {countryFlag(country.iso2)} {country.name}
                </option>
              ))}
          </select>
        </label>

        <div className="flex rounded border border-ink/15 p-0.5" role="group">
          {MEASURES.map(({ id, label }) => (
            <button
              aria-pressed={measure === id}
              className={`rounded px-2.5 py-1 text-[12px] ${
                measure === id ? "bg-ink/10 font-semibold" : "text-ink/60 hover:bg-ink/5"
              }`}
              key={id}
              onClick={() => setMeasure(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-ink/10 bg-surface p-4">
        <div className="flex flex-wrap items-end gap-6">
          <div className="min-w-40">
            <div className="text-[11px] tracking-wide text-ink/55 uppercase">Month</div>
            <div className="mt-0.5 text-2xl">{formatMonth(data.months[index])}</div>
            <div className="text-[11px] text-ink/55">
              {countryFlag(selected.iso2)} {selected.name}
            </div>
          </div>
          <Stat
            color="var(--applications)"
            label="Applications"
            note={
              measure === "absolute"
                ? "first-time and repeat, lodged that month"
                : "per 100,000 residents"
            }
            value={
              applicationValue === null || applicationValue === undefined
                ? "—"
                : measure === "absolute"
                  ? formatCount(applicationValue)
                  : formatRate(applicationValue)
            }
          />
          <Stat
            color="var(--coverage)"
            label="Migration in the news"
            note="of everything GDELT monitored there"
            value={coverageValue === null || coverageValue === undefined ? "—" : formatShare(coverageValue)}
          />
        </div>

        <div className="mt-4">
          {perCapitaUnavailable ? (
            <p className="py-16 text-center text-[13px] text-ink/55">
              No population figure for {selected.name}, so there is no per-capita
              view. Switch back to totals.
            </p>
          ) : (
            <DivergenceChart
              activeIndex={index}
              months={data.months}
              onScrub={setMonthIndex}
              panels={panels}
            />
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-lg font-semibold">
            {formatMonth(data.months[index])}, country by country
          </h2>
          <p className="m-0 text-[12px] text-ink/55">
            {measure === "absolute"
              ? "Switch to per 100,000 and watch the order change."
              : "Applications per 100,000 residents."}
          </p>
        </div>
        <div className="mt-3">
          <CountryRanking
            countries={data.countries}
            measure={measure}
            monthIndex={index}
            onSelect={setSelectedCode}
            selectedCode={selected.code}
          />
        </div>
      </section>

      <footer className="mt-10 border-t border-ink/10 pt-5 text-[12px] leading-relaxed text-ink/60">
        <p className="m-0">
          <strong className="text-ink/80">Applications are not arrivals.</strong>{" "}
          The blue row counts asylum applications lodged in a country
          (Eurostat{" "}
          <a
            className="text-signal"
            href="https://ec.europa.eu/eurostat/databrowser/view/migr_asyappctzm/default/table"
            rel="noreferrer"
            target="_blank"
          >
            migr_asyappctzm
          </a>
          ), which is a different number from border crossings and from people
          who arrive and never apply. Eurostat publishes two to three months
          behind, so the series stops at the last month it reports rather than
          trailing off to zero.
        </p>
        <p className="mt-2 mb-0">
          <strong className="text-ink/80">Coverage is a share, not a count.</strong>{" "}
          The orange row is the percentage of articles from that country&rsquo;s
          own outlets that mention migration, from{" "}
          <a className="text-signal" href="https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/" rel="noreferrer" target="_blank">
            GDELT DOC 2.0
          </a>
          . Its corpus begins in 2017, which is why the chart does. For the
          European Union row there is no such thing as a European newsroom, so
          the share is the mean of the national ones reporting that month.
        </p>
        <p className="mt-2 mb-0">
          <strong className="text-ink/80">Per capita is fairer, not complete.</strong>{" "}
          Population is Eurostat{" "}
          <a className="text-signal" href="https://ec.europa.eu/eurostat/databrowser/view/demo_pjan/default/table" rel="noreferrer" target="_blank">
            demo_pjan
          </a>
          . Where applications land is also shaped by geography and by the
          Dublin rules, not only by how many people a country has.
        </p>
        <p className="mt-3 mb-0 text-ink/45">Dataset rebuilt {data.updated}.</p>
      </footer>
    </main>
  );
}
