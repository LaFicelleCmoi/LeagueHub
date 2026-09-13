export default function Loading() {
  return (
    <div className="space-y-3" role="status" aria-label="Chargement">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
      ))}
    </div>
  );
}
