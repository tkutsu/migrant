"use client";

/**
 * Stateless on purpose: the inline script in app/layout.tsx owns the theme, so
 * the button flips the attribute and the CSS does the rest. Nothing here needs
 * to re-render, which is why the glyph is the same in both modes.
 */
function toggleTheme() {
  const next =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    window.localStorage.setItem("migrant-theme", next);
  } catch {
    // Private browsing: the choice simply resets next visit.
  }
}

export function ThemeToggle() {
  return (
    <button
      aria-label="Switch between light and dark"
      className="rounded border border-ink/15 p-1.5 text-ink/70 hover:bg-ink/5"
      onClick={toggleTheme}
      title="Switch between light and dark"
      type="button"
    >
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16">
        <circle cx="8" cy="8" fill="none" r="5.5" stroke="currentColor" />
        <path d="M8 2.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" />
      </svg>
    </button>
  );
}
