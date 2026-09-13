import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="text-sm font-semibold text-slate-500">404</p>
      <h1 className="mt-2 text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">Ce championnat ou cette page n’existe pas.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Retour à l’accueil
      </Link>
    </div>
  );
}
