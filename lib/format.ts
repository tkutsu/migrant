const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2024-03" → "March 2024". */
export function formatMonth(month: string): string {
  const [year, index] = month.split("-");
  return `${MONTH_NAMES[Number(index) - 1]} ${year}`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

export function formatRate(value: number): string {
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatShare(value: number): string {
  return `${value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

/**
 * Regional indicators for the flag. EU has its own, and the codes that are not
 * countries fall back to the letters themselves.
 */
export function countryFlag(iso2: string): string {
  if (iso2.length !== 2) return "";
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map((letter) => letter.charCodeAt(0) + 0x1f1a5),
  );
}
