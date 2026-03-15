"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Newspaper, Loader2, RefreshCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
}

interface DashboardNewsFeedProps {
  activeTicker: string | null;
}

export function DashboardNewsFeed({ activeTicker }: DashboardNewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchNews() {
      if (!activeTicker) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/market/news?ticker=${activeTicker}`);
        if (!res.ok) throw new Error("Error fetching news");
        const data = await res.json();
        if (isMounted) {
          setNews(data.news?.slice(0, 5) || []);
        }
      } catch {
        if (isMounted) {
          setError("No se pudieron cargar las noticias.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchNews();

    return () => {
      isMounted = false;
    };
  }, [activeTicker]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/80 bg-surface/70 shadow-panel backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-white">Market Feed</h3>
          {activeTicker && (
            <span className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
              {activeTicker}
            </span>
          )}
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {!activeTicker ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
            Selecciona un activo para ver sus noticias.
          </div>
        ) : isLoading && news.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted">
            <RefreshCcw className="h-5 w-5 animate-spin text-muted/50" />
            <p>Buscando titulares...</p>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-danger">
            {error}
          </div>
        ) : news.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
            No hay noticias recientes para {activeTicker}.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {news.map((item) => {
              const date = new Date(item.providerPublishTime * 1000);
              return (
                <li key={item.uuid}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-1 rounded-xl p-3 transition-colors hover:bg-surface-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium leading-snug text-white/90 group-hover:text-primary transition-colors line-clamp-2">
                        {item.title}
                      </p>
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-muted">
                      <span className="text-primary/70">{item.publisher}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(date, { addSuffix: true, locale: es })}</span>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
