import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { SiteHeader } from "@/components/SiteHeader";
import { clubIndex } from "@/lib/clubs";
import { UCL_TRACKER_URL } from "@/lib/external-links";
import { LEAGUES } from "@/lib/leagues";
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
  applicationName: "LeagueHub",
  // Installé sur iPhone ou iPad, le site s'ouvre en plein écran comme une application.
  appleWebApp: { capable: true, title: "LeagueHub", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
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
        <ServiceWorkerRegistration />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="mt-8 border-t border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3">
              <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
                <span className="grid size-8 place-items-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  <Trophy className="size-4" aria-hidden />
                </span>
                LeagueHub
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Scores en direct, classements, coupes et palmarès des 5 grands championnats européens.
              </p>
            </div>
            <nav aria-label="Championnats">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Championnats</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {LEAGUES.map((league) => (
                  <li key={league.slug}>
                    <Link href={`/${league.slug}`} className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                      {league.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Compétitions">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Compétitions</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/direct" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                    Direct, toutes compétitions
                  </Link>
                </li>
                <li>
                  <Link href="/coupes" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                    Coupes nationales
                  </Link>
                </li>
                <li>
                  <a
                    href={UCL_TRACKER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    Tracker Ligue des champions
                    <span className="sr-only"> (nouvel onglet)</span>
                  </a>
                </li>
              </ul>
            </nav>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">À propos</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li>Scores et calendriers : ESPN</li>
                <li>Palmarès : Wikidata</li>
                <li>Horaires en heure de Paris</li>
                <li>Site non officiel, sans lien avec les ligues ni les clubs.</li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
