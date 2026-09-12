"use client";

import { useMemo } from "react";
import { countryFlag, formatCount, formatRate } from "@/lib/format";
import { ranking } from "@/lib/series";
import type { CountrySeries, Measure } from "@/lib/types";

const ROW_H = 26;

interface CountryRankingProps {
  countries: readonly CountrySeries[];
  measure: Measure;
  monthIndex: number;
  selectedCode: string;
  onSelect: (code: string) => void;
}

/**
 * Every country in one month, tallest first. Rows are positioned rather than
 * reordered in the DOM, so switching to per-capita animates the reshuffle -
 * which is the argument: the frontline countries are not the big ones.
 */
export function CountryRanking({
  countries,
  measure,
  monthIndex,
  selectedCode,
  onSelect,
}: CountryRankingProps) {
  const rows = useMemo(
    () => ranking(countries, measure, monthIndex),
    [countries, measure, monthIndex],
  );

  const peak = Math.max(
    ...rows.map((row) => row.value ?? 0),
    Number.MIN_VALUE,
  );
  const format = measure === "absolute" ? formatCount : formatRate;

  return (
    <ol
      className="relative m-0 list-none p-0"
      style={{ height: rows.length * ROW_H }}
    >
      {rows.map(({ country, value }, rank) => {
        const selected = country.code === selectedCode;
        return (
          <li
            className="absolute inset-x-0 transition-transform duration-500 ease-out motion-reduce:transition-none"
            key={country.code}
            style={{ transform: `translateY(${rank * ROW_H}px)` }}
          >
            <button
              aria-current={selected}
              className={`flex h-[26px] w-full items-center gap-2 rounded px-1.5 text-left text-[12px] ${
                selected ? "bg-ink/8 font-semibold" : "hover:bg-ink/5"
              }`}
              onClick={() => onSelect(country.code)}
              type="button"
            >
              <span aria-hidden="true" className="w-4 text-right text-ink/40 tabular-nums">
                {value === null ? "" : rank + 1}
              </span>
              <span aria-hidden="true">{countryFlag(country.iso2)}</span>
              <span className="w-28 shrink-0 truncate">{country.name}</span>
              <span className="h-[6px] flex-1 rounded-[2px] bg-ink/8">
                {value !== null && (
                  <span
                    className="block h-full rounded-[2px] bg-signal transition-[width] duration-500 ease-out motion-reduce:transition-none"
                    style={{ width: `${Math.max(1, (value / peak) * 100)}%` }}
                  />
                )}
              </span>
              <span className="w-16 shrink-0 text-right tabular-nums text-ink/70">
                {value === null ? "—" : format(value)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
