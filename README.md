# Reality and coverage

Monthly asylum applications across Europe, shown beside how much of each
country's news was about migration. The question is whether the second follows
the first.

## What you can do with it

Two rows share one month axis: applications lodged that month, and the share of
that country's monitored news mentioning migration. Drag across them and both
move together, so the months where the lines part company are visible rather
than argued.

Underneath, every country ordered by that month's applications. Switch from
totals to per 100,000 residents and the order rearranges: Germany, France and
Spain stop being the top of the list and Cyprus, Greece and Malta take it.
That reshuffle is the point of the toggle.

Pick a country from the list or the dropdown and both rows follow it.

## Where the numbers come from

**Applications** are Eurostat `migr_asyappctzm`, asylum applicants by month and
country of asylum, all citizenships, first-time and repeat together. Eurostat
publishes two to three months behind, so the series stops at the last month the
EU aggregate actually reports rather than trailing off to zero.

**Coverage** is GDELT DOC 2.0 `timelinevol`, one query per country, filtered to
that country's own outlets. It is a percentage of articles, not a count, and
GDELT's corpus begins in 2017 — which is why the whole app does. The European
Union row has no newsroom of its own, so its share is the mean of the national
ones reporting that month.

**Population** is Eurostat `demo_pjan`, on 1 January of the latest year each
country reports.

Applications are not arrivals and not border crossings; three different numbers
that get used interchangeably. Only the first is on screen.

## Running it

```sh
pnpm install
pnpm build:data   # refreshes public/data/migration.json
pnpm dev
```

`public/data` is committed. GDELT throttles hard and its soft-ban outlasts any
backoff worth sitting through, so a country it refuses keeps the coverage
already in the repo instead of emptying its panel, and the sweep gives up after
three consecutive refusals rather than spending hours being told to slow down.

`pnpm build` runs the refresh and then exports to `out/`. A weekly GitHub
Actions run does the same and publishes to Pages.

## Not yet built

Tone, as its own layer under the volume line. An attention-per-applicant
choropleth. Origin-to-destination flows from the citizenship dimension, and
temporary protection as its own series, where Ukraine behaved unlike anything
else in both the numbers and the coverage. The 2015–16 collapse in attention
needs GDELT's GKG bulk files; the DOC API cannot reach back that far.
