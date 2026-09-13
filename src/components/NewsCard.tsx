import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { Article } from "@/lib/types";

export function NewsCard({ article }: { article: Article }) {
  const content = (
    <>
      <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
        {article.image && (
          <Image
            src={article.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <time dateTime={article.published} className="text-xs text-slate-500 dark:text-slate-400">
          {formatDateTime(article.published)}
        </time>
        <h3 className="mt-1 font-semibold leading-snug group-hover:underline">{article.headline}</h3>
        {article.description && (
          <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{article.description}</p>
        )}
        {article.url && (
          <span className="mt-auto flex items-center gap-1 pt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            Lire sur ESPN
            <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">(nouvel onglet)</span>
          </span>
        )}
      </div>
    </>
  );

  const className =
    "group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

  return article.url ? (
    <a href={article.url} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <article className={className}>{content}</article>
  );
}
