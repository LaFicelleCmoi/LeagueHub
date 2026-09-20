import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { clubIndex } from "@/lib/clubs";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LeagueHub — Les 5 grands championnats européens",
    template: "%s · LeagueHub",
  },
  description:
    "Classements, résultats, calendriers, buteurs et actualités de la Premier League, La Liga, Serie A, Bundesliga et Ligue 1.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Le thème est posé sur <html> par le script ci-dessous : le serveur ne peut pas le connaître.
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${geistSans.variable} flex min-h-dvh flex-col font-sans antialiased`}>
        {/* Les clubs du calendrier alimentent la recherche de l'en-tête. */}
        <SiteHeader clubs={clubIndex()} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 dark:border-slate-800">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between dark:text-slate-400">
            <p>LeagueHub — site non officiel, sans lien avec les ligues ni les clubs.</p>
            <p>Données : ESPN · Horaires en heure de Paris</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
