"use client";

import { useEffect, useState } from "react";
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

  const freshItems = items.slice(0, 3);
  const remainingItems = items.slice(3);

  return (
    <Card
      title="Radar Macro Externo"
      subtitle="Titulares recientes y contexto macro para seguir el mercado de un vistazo"
    >
      {isLoading ? (
        <p className="text-sm text-muted">Cargando radar macro…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : items.length > 0 ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-surface-muted/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Titulares</p>
              <p className="mt-2 text-2xl font-semibold text-white">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-muted/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Más reciente</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {items[0]?.publishedAt ? dateFormatter.format(new Date(items[0].publishedAt)) : "Sin fecha"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-muted/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Foco</p>
              <p className="mt-2 text-sm text-text">Contexto macro y mercado para acompañar tus lecturas de activos.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {freshItems.map((item) => (
              <a
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-border/70 bg-surface-muted/20 p-4 transition-colors hover:border-primary/35 hover:bg-surface-muted/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="warning">Reciente</Badge>
                  {item.publishedAt && (
                    <span className="text-[11px] text-muted">
                      {dateFormatter.format(new Date(item.publishedAt))}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm font-medium leading-snug text-text">{item.title}</p>
              </a>
            ))}
          </div>

          {remainingItems.length > 0 && (
            <div className="rounded-2xl border border-border/70 bg-surface-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Más titulares</p>
                <Badge tone="default">{remainingItems.length} adicionales</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {remainingItems.map((item) => (
                  <a
                    key={item.link}
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-border/60 bg-surface/40 p-3 transition-colors hover:border-primary/35 hover:bg-surface/55"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone="default">Macro</Badge>
                      {item.publishedAt && (
                        <span className="text-[11px] text-muted">
                          {dateFormatter.format(new Date(item.publishedAt))}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium leading-snug text-text">{item.title}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">No hay publicaciones recientes disponibles.</p>
      )}
    </Card>
  );
}
