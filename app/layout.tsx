import type { Metadata } from "next";
import "./globals.css";

const themeInitializationScript = `
  (() => {
    let theme = "light";
    try {
      const storedTheme = window.localStorage.getItem("migrant-theme");
      theme = storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    } catch {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.dataset.theme = theme;
  })();
`;

export const metadata: Metadata = {
  title: "Reality and coverage",
  description:
    "Monthly asylum applications across Europe from Eurostat, shown beside how much of each country's news was about migration.",
  applicationName: "Reality and coverage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
