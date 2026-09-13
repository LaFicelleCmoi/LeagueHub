"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Trophy, X } from "lucide-react";
import { LEAGUES } from "@/lib/leagues";
import { LeagueLogo } from "./LeagueLogo";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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

        <nav aria-label="Championnats" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {LEAGUES.map((league) => {
              const active = pathname.startsWith(`/${league.slug}`);
              return (
                <li key={league.slug}>
                  <Link
                    href={`/${league.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    }`}
                  >
                    <LeagueLogo league={league} size={20} />
                    {league.name}
                  </Link>
                </li>
              );
            })}
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
        <nav id="mobile-nav" aria-label="Championnats" className="border-t border-slate-200 lg:hidden dark:border-slate-800">
          <ul className="mx-auto grid max-w-6xl gap-1 p-2">
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
          </ul>
        </nav>
      )}
    </header>
  );
}
