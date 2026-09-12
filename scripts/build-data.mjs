// Builds public/data/migration.json: one monthly row per country holding both
// sides of the question this app asks - how many people actually applied for
// asylum, and how much of that country's news was about migration.
//
//   * Eurostat migr_asyappctzm - monthly asylum applicants by country of
//     asylum. Keyless JSON-stat. Runs 2-3 months behind; the most recent
//     months exist as empty cells, which is why the series is trimmed to the
//     last month the EU aggregate actually reports.
//   * Eurostat demo_pjan - population on 1 January, for the per-capita view.
//   * GDELT DOC 2.0 timelinevol - share of that country's monitored news
//     mentioning migration. The corpus floor is 2017-01-01, so that is where
//     the whole app starts.
//
// GDELT throttles hard and undocumented, so the sweep is deliberately slow and
// every country that fails keeps the coverage already committed to the repo
// rather than blanking its panel.
import { readFile, writeFile } from "node:fs/promises";

const EUROSTAT =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const GDELT = "https://api.gdeltproject.org/api/v2/doc/doc";
const OUTPUT = new URL("../public/data/migration.json", import.meta.url);

// GDELT DOC 2.0 rejects anything earlier outright.
const FIRST_MONTH = "2017-01";
// English terms, because GDELT machine-translates the corpus into English
// before indexing it; querying in 24 languages would search the translations.
const QUERY = "(migrants OR migration OR asylum OR refugees)";

// Polite by default, and much slower once GDELT starts refusing.
const PAUSE_MS = 45_000;
const REQUEST_MS = 45_000;
const BACKOFF_MS = [45_000, 120_000];
// Consecutive countries GDELT refuses before the sweep gives up for this run.
const GIVE_UP_AFTER = 8;

// Eurostat geo code -> ISO 3166-1 alpha-2 (for the flag) and FIPS 10-4 (which
// is the code GDELT's sourcecountry: operator wants).
const COUNTRIES = [
  ["BE", "BE", "BE"], ["BG", "BG", "BU"], ["CZ", "CZ", "EZ"], ["DK", "DK", "DA"],
  ["DE", "DE", "GM"], ["EE", "EE", "EN"], ["IE", "IE", "EI"], ["EL", "GR", "GR"],
  ["ES", "ES", "SP"], ["FR", "FR", "FR"], ["HR", "HR", "HR"], ["IT", "IT", "IT"],
  ["CY", "CY", "CY"], ["LV", "LV", "LG"], ["LT", "LT", "LH"], ["LU", "LU", "LU"],
  ["HU", "HU", "HU"], ["MT", "MT", "MT"], ["NL", "NL", "NL"], ["AT", "AT", "AU"],
  ["PL", "PL", "PL"], ["PT", "PT", "PO"], ["RO", "RO", "RO"], ["SI", "SI", "SI"],
  ["SK", "SK", "LO"], ["FI", "FI", "FI"], ["SE", "SE", "SW"], ["IS", "IS", "IC"],
  ["LI", "LI", "LS"], ["NO", "NO", "NO"], ["CH", "CH", "SZ"], ["UK", "GB", "UK"],
  ["ME", "ME", "MJ"],
].map(([code, iso2, fips]) => ({ code, iso2, fips }));

const EU_CODE = "EU27_2020";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------- Eurostat -------------------------------- */

async function eurostat(dataset, params) {
  const url = `${EUROSTAT}/${dataset}?${new URLSearchParams({
    format: "JSON",
    lang: "en",
    ...params,
  })}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_MS) });
  if (!response.ok) {
    throw new Error(`Eurostat ${dataset} responded ${response.status}`);
  }
  return response.json();
}

/**
 * JSON-stat is a flat value array plus one index per dimension; this turns it
 * back into lookups by dimension code.
 */
function reader(payload) {
  const strides = [];
  let stride = 1;
  for (let i = payload.size.length - 1; i >= 0; i -= 1) {
    strides[i] = stride;
    stride *= payload.size[i];
  }
  const indexes = payload.id.map(
    (dimension) => payload.dimension[dimension].category.index,
  );

  return {
    keys: (dimension) =>
      Object.keys(payload.dimension[dimension].category.index),
    labels: (dimension) => payload.dimension[dimension].category.label,
    at(selection) {
      let offset = 0;
      for (let i = 0; i < payload.id.length; i += 1) {
        // Dimensions the caller does not name are the ones the query pinned to
        // a single category, so position 0 is the only one there is. A named
        // category the table does not have is missing, not position 0 -
        // reading it as 0 would quietly hand back the EU aggregate.
        const key = selection[payload.id[i]];
        const position = key === undefined ? 0 : indexes[i][key];
        if (position === undefined) return null;
        offset += position * strides[i];
      }
      const value = payload.value[offset];
      return typeof value === "number" ? value : null;
    },
  };
}

/* --------------------------------- GDELT --------------------------------- */

/**
 * Daily volume-intensity for one country, averaged into months. GDELT answers
 * a throttled request with a plain-text apology rather than an error status,
 * so the body is what decides whether the call worked.
 */
async function coverageFor(fips, start, end) {
  for (let attempt = 0; ; attempt += 1) {
    const url = `${GDELT}?${new URLSearchParams({
      query: `${QUERY} sourcecountry:${fips}`,
      mode: "timelinevol",
      format: "json",
      startdatetime: start,
      enddatetime: end,
    })}`;
    // A refusing GDELT sometimes accepts the connection and then says nothing,
    // which without this would hang the whole build on undici's five-minute
    // default rather than on the backoff below.
    const { status, body } = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_MS),
    })
      .then(async (response) => ({ status: response.status, body: await response.text() }))
      .catch((error) => ({ status: 0, body: error.message }));

    if (body.trimStart().startsWith("{")) {
      const series = JSON.parse(body).timeline?.[0]?.data ?? [];
      const totals = new Map();
      for (const point of series) {
        const month = `${point.date.slice(0, 4)}-${point.date.slice(4, 6)}`;
        const running = totals.get(month) ?? [0, 0];
        totals.set(month, [running[0] + point.value, running[1] + 1]);
      }
      return new Map(
        [...totals].map(([month, [sum, days]]) => [
          month,
          Number((sum / days).toFixed(4)),
        ]),
      );
    }

    // Only a 429 or a dropped connection is worth waiting out. Anything else is
    // GDELT rejecting the query itself, which no amount of backoff will change,
    // and reporting it as throttling would hide a bad country code.
    if (status !== 429 && status !== 0) {
      process.stdout.write(` HTTP ${status}: ${body.trim().slice(0, 80)}`);
      return null;
    }
    if (attempt >= BACKOFF_MS.length) return null;
    const reason = status === 429 ? "throttled" : "no response";
    process.stdout.write(` ${reason}, waiting ${BACKOFF_MS[attempt] / 1000}s…`);
    await sleep(BACKOFF_MS[attempt]);
  }
}

/* --------------------------------- Build --------------------------------- */

function monthRange(first, last) {
  const months = [];
  let [year, month] = first.split("-").map(Number);
  const [lastYear, lastMonth] = last.split("-").map(Number);
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    if (month === 12) {
      year += 1;
      month = 1;
    } else {
      month += 1;
    }
  }
  return months;
}

async function previousBuild() {
  try {
    const previous = JSON.parse(await readFile(OUTPUT, "utf8"));
    const byCode = new Map();
    for (const country of [...previous.countries, previous.europe]) {
      // Months with nothing in them are dropped rather than stored, so a
      // country the last build never reached and one that is simply absent
      // look the same here.
      const reported = previous.months
        .map((month, index) => [month, country.coverage[index]])
        .filter(([, value]) => value !== null);
      if (reported.length) byCode.set(country.code, new Map(reported));
    }
    return byCode;
  } catch {
    return new Map();
  }
}

async function main() {
  console.log("Eurostat: monthly asylum applications…");
  const applications = reader(
    await eurostat("migr_asyappctzm", {
      citizen: "TOTAL",
      sex: "T",
      age: "TOTAL",
      applicant: "TOTAL",
      unit: "PER",
      sinceTimePeriod: FIRST_MONTH,
    }),
  );

  // Everything after the EU aggregate's last reported month is publication lag
  // rather than a real drop to zero, so the whole dataset stops there.
  const reported = applications
    .keys("time")
    .filter((month) => applications.at({ geo: EU_CODE, time: month }) !== null);
  if (!reported.length) throw new Error("migr_asyappctzm returned no EU rows");
  const months = monthRange(FIRST_MONTH, reported[reported.length - 1]);
  console.log(`  ${months[0]} → ${months[months.length - 1]}`);

  console.log("Eurostat: population…");
  const population = reader(
    await eurostat("demo_pjan", {
      sex: "T",
      age: "TOTAL",
      sinceTimePeriod: String(Number(months[0].slice(0, 4)) - 2),
    }),
  );
  const years = population.keys("time");
  const latestPopulation = (code) => {
    for (let i = years.length - 1; i >= 0; i -= 1) {
      const value = population.at({ geo: code, time: years[i] });
      if (value !== null) return { population: value, populationYear: Number(years[i]) };
    }
    return { population: null, populationYear: null };
  };

  const lastMonth = months[months.length - 1];
  const [endYear, endMonth] = lastMonth.split("-").map(Number);
  const start = `${months[0].replace("-", "")}01000000`;
  const end = `${lastMonth.replace("-", "")}${new Date(
    Date.UTC(endYear, endMonth, 0),
  ).getUTCDate()}235959`;
  const kept = await previousBuild();
  const names = applications.labels("geo");

  const row = (code, iso2, coverage) => ({
    code,
    iso2,
    name: names[code] ?? code,
    ...latestPopulation(code),
    applications: months.map((month) =>
      applications.at({ geo: code, time: month }),
    ),
    coverage: months.map((month) => coverage?.get(month) ?? null),
  });

  // Two rules keep this sweep survivable. A country whose committed coverage
  // already reaches the last month is left alone, so the request budget goes
  // on the gaps and a run with nothing new to fetch costs nothing. And once
  // GDELT is clearly refusing, the sweep stops rather than spending an hour
  // being told to slow down - the countries it never reached keep what is in
  // the repo, and the next run picks them up.
  const rows = [];
  let refusals = 0;
  for (const { code, iso2, fips } of COUNTRIES) {
    const previous = kept.get(code);
    if (previous?.get(lastMonth) != null) {
      rows.push(row(code, iso2, previous));
      continue;
    }

    process.stdout.write(`GDELT ${code}…`);
    const fetched =
      refusals >= GIVE_UP_AFTER ? null : await coverageFor(fips, start, end);
    refusals = fetched ? 0 : refusals + 1;
    const coverage = fetched ?? previous;
    console.log(fetched ? " ok" : coverage ? " kept previous" : " no data");

    rows.push(row(code, iso2, coverage));
    if (refusals === 0) await sleep(PAUSE_MS);
  }

  // GDELT has no notion of "the EU", so the aggregate's coverage is the mean of
  // the national shares that reported that month - an average newsroom rather
  // than a European one. Applications are Eurostat's own EU27 total.
  const europe = {
    code: EU_CODE,
    iso2: "EU",
    name: "European Union",
    ...latestPopulation(EU_CODE),
    applications: months.map((month) => applications.at({ geo: EU_CODE, time: month })),
    coverage: months.map((_, index) => {
      const shares = rows
        .map((country) => country.coverage[index])
        .filter((share) => share !== null);
      if (!shares.length) return null;
      const mean = shares.reduce((sum, share) => sum + share, 0) / shares.length;
      return Number(mean.toFixed(4));
    }),
  };

  await writeFile(
    OUTPUT,
    `${JSON.stringify(
      {
        updated: new Date().toISOString().slice(0, 10),
        months,
        europe,
        countries: rows,
      },
      null,
      1,
    )}\n`,
  );
  console.log(`Wrote ${rows.length + 1} countries × ${months.length} months.`);
}

await main();
