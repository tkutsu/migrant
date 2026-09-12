import type { CountrySeries, Measure } from "./types";

/** Per-capita is expressed per 100,000 residents; per-million hides Malta. */
export const PER_CAPITA_BASE = 100_000;

/** The applications series in the chosen measure. */
export function measured(
  country: CountrySeries,
  measure: Measure,
): (number | null)[] {
  if (measure === "absolute") return country.applications;
  const { population } = country;
  if (!population) return country.applications.map(() => null);
  return country.applications.map((value) =>
    value === null ? null : (value * PER_CAPITA_BASE) / population,
  );
}

export function measuredAt(
  country: CountrySeries,
  measure: Measure,
  index: number,
): number | null {
  const value = country.applications[index];
  if (value === null || value === undefined) return null;
  if (measure === "absolute") return value;
  if (!country.population) return null;
  return (value * PER_CAPITA_BASE) / country.population;
}

/** Last index where both sides have a number, which is where the app opens. */
export function lastComplete(country: CountrySeries): number {
  for (let index = country.applications.length - 1; index >= 0; index -= 1) {
    if (country.applications[index] !== null && country.coverage[index] !== null) {
      return index;
    }
  }
  return country.applications.length - 1;
}

export interface RankedCountry {
  country: CountrySeries;
  value: number | null;
}

/**
 * Countries ordered by applications in one month. Whichever measure is on,
 * the ones with nothing reported keep their place at the bottom rather than
 * being dropped, so the list is the same length either way and the reshuffle
 * reads as movement instead of arrival.
 */
export function ranking(
  countries: readonly CountrySeries[],
  measure: Measure,
  index: number,
): RankedCountry[] {
  return countries
    .map((country) => ({ country, value: measuredAt(country, measure, index) }))
    .sort((a, b) => {
      if (a.value === null) return b.value === null ? a.country.name.localeCompare(b.country.name) : 1;
      if (b.value === null) return -1;
      return b.value - a.value;
    });
}
