"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ListOrdered, Newspaper, Target, type LucideIcon } from "lucide-react";

const TABS: { segment: string; label: string; icon: LucideIcon }[] = [
  { segment: "", label: "Classement", icon: ListOrdered },
  { segment: "/matchs", label: "Matchs", icon: CalendarDays },
  { segment: "/buteurs", label: "Buteurs", icon: Target },
  { segment: "/actualites", label: "Actualités", icon: Newspaper },
];

export function LeagueTabs({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections du championnat" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(({ segment, label, icon: Icon }) => {
          const href = `/${slug}${segment}`;
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-[var(--accent)] text-slate-900 dark:text-white"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
