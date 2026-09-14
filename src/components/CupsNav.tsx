import Link from "next/link";
import { CUPS, type CupSlug } from "@/lib/cups";
import { CupLogo } from "./CupLogo";

const chip = (active: boolean) =>
  `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
  }`;

// Navigation entre les 5 coupes (défilement horizontal sur mobile).
export function CupsNav({ active }: { active?: CupSlug }) {
  return (
    <nav aria-label="Coupes nationales" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex min-w-max gap-2">
        <li>
          <Link href="/coupes" aria-current={active ? undefined : "page"} className={chip(!active)}>
            Toutes les coupes
          </Link>
        </li>
        {CUPS.map((cup) => (
          <li key={cup.slug}>
            <Link
              href={`/coupes/${cup.slug}`}
              aria-current={active === cup.slug ? "page" : undefined}
              className={chip(active === cup.slug)}
            >
              <CupLogo cup={cup} size={18} />
              {cup.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
