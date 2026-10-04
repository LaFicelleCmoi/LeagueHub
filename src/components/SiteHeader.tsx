"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, Star, Trophy, X } from "lucide-react";
import type { ClubIndexEntry } from "@/lib/clubs";
import { useCupsTab } from "@/lib/cups-tab";
import { UCL_TRACKER_URL } from "@/lib/external-links";
import { LEAGUES } from "@/lib/leagues";
import { ClubSearch } from "./ClubSearch";
import { CupsTabSwitch } from "./CupsTabSwitch";
import { LeagueLogo } from "./LeagueLogo";
import { SettingsMenu } from "./SettingsMenu";
import { ThemeToggle } from "./ThemeToggle";

function LiveDot() {
  return (
    <span aria-hidden className="relative flex size-2 shrink-0">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:hidden" />
      <span className="relative inline-flex size-2 rounded-full bg-red-500" />
    </span>
  );
}

export function SiteHeader({ clubs }: { clubs: ClubIndexEntry[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const cupsTab = useCupsTab();
  const onCups = pathname.startsWith("/coupes");
  const onDirect = pathname.startsWith("/direct");
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" onClick={close} className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            <Trophy className="size-4" aria-hidden />
          </span>
          LeagueHub
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {LEAGUES.map((league) => {
              const active = pathname.startsWith(`/${league.slug}`);
              return (
                <li key={league.slug}>
                  <Link
                    href={`/${league.slug}`}
                    aria-current={active ? "page" : undefined}
                    title={league.name}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors xl:px-3 ${
                      active
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    }`}
                  >
                    <LeagueLogo league={league} size={20} />
                    {/* Logos seuls : la barre porte aussi Direct, LDC et la recherche. Le nom reste lu par les lecteurs d'écran et s'affiche au survol. */}
                    <span className="sr-only">{league.name}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/direct"
                aria-current={onDirect ? "page" : undefined}
                className={`ml-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors ${
                  onDirect
                    ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <LiveDot />
                Direct
              </Link>
            </li>
            {cupsTab && (
              <li>
                <Link
                  href="/coupes"
                  aria-current={onCups ? "page" : undefined}
                  className={`ml-1 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm transition hover:brightness-105 ${
                    onCups ? "ring-2 ring-amber-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-950" : "ring-1 ring-amber-500/40"
                  }`}
                >
                  <Trophy className="size-3.5" aria-hidden />
                  Coupes
                </Link>
              </li>
            )}
            <li>
              <a
                href={UCL_TRACKER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-950 via-indigo-800 to-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-indigo-400/30 transition hover:brightness-125"
              >
                <Star className="size-3.5 fill-amber-300 text-amber-300" aria-hidden />
                LDC
                <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
                <span className="sr-only"> : tracker Ligue des champions 2026-2027 (nouvel onglet)</span>
              </a>
            </li>
            <li className="ml-2 w-44 border-l border-slate-200 pl-2 xl:w-52 dark:border-slate-800">
              <ClubSearch clubs={clubs} />
            </li>
            <li>
              <SettingsMenu />
            </li>
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="grid size-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Navigation principale" className="border-t border-slate-200 lg:hidden dark:border-slate-800">
          <ul className="mx-auto grid max-w-6xl gap-1 p-2">
            <li className="px-1 pb-2">
              <ClubSearch clubs={clubs} onNavigate={close} />
            </li>
            <li>
              <Link
                href="/direct"
                onClick={close}
                aria-current={onDirect ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 font-semibold ${
                  onDirect ? "bg-red-50 dark:bg-red-500/15" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="grid size-6 place-items-center">
                  <LiveDot />
                </span>
                <span>Direct</span>
                <span className="ml-auto text-sm font-normal text-slate-500 dark:text-slate-400">Tous les matchs du jour</span>
              </Link>
            </li>
            {LEAGUES.map((league) => {
              const active = pathname.startsWith(`/${league.slug}`);
              return (
                <li key={league.slug}>
                  <Link
                    href={`/${league.slug}`}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 font-medium ${
                      active ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <LeagueLogo league={league} size={24} />
                    <span>{league.name}</span>
                    <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">{league.country}</span>
                  </Link>
                </li>
              );
            })}
            {cupsTab && (
              <li>
                <Link
                  href="/coupes"
                  onClick={close}
                  aria-current={onCups ? "page" : undefined}
                  className="mt-1 flex items-center gap-3 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 px-3 py-3 font-semibold text-amber-950"
                >
                  <span className="grid size-6 place-items-center">
                    <Trophy className="size-5" aria-hidden />
                  </span>
                  <span>Coupes nationales</span>
                  <span className="ml-auto text-sm font-normal text-amber-900">5 coupes</span>
                </Link>
              </li>
            )}
            <li>
              <a
                href={UCL_TRACKER_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="mt-1 flex items-center gap-3 rounded-lg bg-gradient-to-r from-indigo-950 via-indigo-800 to-blue-700 px-3 py-3 font-semibold text-white"
              >
                <span className="grid size-6 place-items-center">
                  <Star className="size-5 fill-amber-300 text-amber-300" aria-hidden />
                </span>
                <span>Ligue des champions</span>
                <span className="ml-auto inline-flex items-center gap-1 text-sm font-normal text-indigo-200">
                  Tracker 2026-27
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            </li>
            <li className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-800">
              <CupsTabSwitch variant="row" />
            </li>
            <li>
              <ThemeToggle variant="row" />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
