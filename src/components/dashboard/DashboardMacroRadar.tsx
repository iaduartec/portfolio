"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MacroRadarItem = {
  title: string;
  link: string;
  publishedAt?: string;
  description?: string;
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
});

export function DashboardMacroRadar() {
  const [items, setItems] = useState<MacroRadarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/macro-radar", { cache: "no-store" });
        const payload = (await response.json()) as { items?: MacroRadarItem[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "No se pudo cargar el radar macro.");
        }
        if (!ignore) {
          setItems(Array.isArray(payload.items) ? payload.items : []);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el radar macro.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const featuredItem = items[0];
  const secondaryItems = useMemo(() => items.slice(1, 4), [items]);

  return (
    <Card
      title="Radar Macro Externo"
      subtitle="Lecturas editoriales y contexto geopolítico desde Inversiones en el Mundo"
      footer={
        <Link
          href="https://inversionesenelmundo.substack.com?utm_source=navbar&utm_medium=web"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-medium text-primary transition-colors hover:text-white"
        >
          Abrir fuente
        </Link>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted">Cargando radar macro…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : featuredItem ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.95fr)]">
          <a
            href={featuredItem.link}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-border/70 bg-surface-muted/25 p-4 transition-colors hover:border-primary/40 hover:bg-surface-muted/35"
          >
            <div className="flex items-center gap-2">
              <Badge tone="warning">Macro</Badge>
              {featuredItem.publishedAt && (
                <span className="text-[11px] text-muted">
                  {dateFormatter.format(new Date(featuredItem.publishedAt))}
                </span>
              )}
            </div>
            <h3 className="mt-3 text-lg font-semibold leading-snug text-white">{featuredItem.title}</h3>
            {featuredItem.description && (
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted">
                {featuredItem.description}
              </p>
            )}
          </a>

          <div className="space-y-3">
            {secondaryItems.map((item) => (
              <a
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-border/70 bg-surface-muted/20 p-3 transition-colors hover:border-primary/35 hover:bg-surface-muted/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="default">Substack</Badge>
                  {item.publishedAt && (
                    <span className="text-[11px] text-muted">
                      {dateFormatter.format(new Date(item.publishedAt))}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium leading-snug text-text">{item.title}</p>
              </a>
            ))}

            {secondaryItems.length === 0 && (
              <p className="text-sm text-muted">No hay más publicaciones recientes para mostrar.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">No hay publicaciones recientes disponibles.</p>
      )}
    </Card>
  );
}
