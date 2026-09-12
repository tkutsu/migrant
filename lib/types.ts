/** One country's two series, both aligned to `MigrationData.months`. */
export interface CountrySeries {
  /** Eurostat geo code: EL for Greece, UK for the United Kingdom. */
  code: string;
  /** ISO 3166-1 alpha-2, which is what the flag is built from. */
  iso2: string;
  name: string;
  /** Population on 1 January of `populationYear`, for the per-capita view. */
  population: number | null;
  populationYear: number | null;
  /** Asylum applications lodged that month. */
  applications: (number | null)[];
  /** Percent of that country's monitored news mentioning migration. */
  coverage: (number | null)[];
}

export interface MigrationData {
  /** Date the dataset was last rebuilt. */
  updated: string;
  /** "YYYY-MM", from the GDELT corpus floor to the last month Eurostat has. */
  months: string[];
  europe: CountrySeries;
  countries: CountrySeries[];
}

/** Absolute applications, or applications per 100,000 residents. */
export type Measure = "absolute" | "per-capita";
