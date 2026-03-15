"use client";

import Link from "next/link";
import { Github, Twitter, Linkedin, Activity } from "lucide-react";
import { useEffect, useState } from "react";

function ApiHealthBadge() {
  const [status, setStatus] = useState<"checking" | "ok" | "degraded">("checking");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const start = Date.now();
        const res = await fetch("/api/quotes?symbols=SPY", { cache: "no-store" });
        const latency = Date.now() - start;
        if (!cancelled) {
          setStatus(res.ok && latency < 8000 ? "ok" : "degraded");
        }
      } catch {
        if (!cancelled) setStatus("degraded");
      }
    };
    void check();
    return () => { cancelled = true; };
  }, []);

  const label = status === "ok" ? "Datos en vivo" : status === "degraded" ? "Datos degradados" : "Verificando…";
  const dotClass =
    status === "ok"
      ? "bg-success animate-pulse-soft"
      : status === "degraded"
        ? "bg-warning"
        : "bg-muted animate-pulse-soft";
  const textClass =
    status === "ok" ? "text-success" : status === "degraded" ? "text-warning" : "text-muted";

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/60 px-2.5 py-1">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span className={`text-[10px] font-medium ${textClass}`}>{label}</span>
      <Activity size={10} className={textClass} />
    </div>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-border/70 bg-surface/45 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-4 lg:gap-12">
          <div className="md:col-span-2">
            <Link href="/" className="mb-4 inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="text-white">MyInvest</span>
              <span className="text-primary">View</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Convierte datos dispersos en decisiones de inversión con contexto IA y visualización financiera de nivel profesional.
            </p>
            <div className="mt-4">
              <ApiHealthBadge />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text">Plataforma</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/" className="transition-colors hover:text-primary">Inicio</Link></li>
              <li><Link href="/portfolio" className="transition-colors hover:text-primary">Portfolio</Link></li>
              <li><Link href="/lab" className="transition-colors hover:text-primary">Lab</Link></li>
              <li><Link href="/ai-agents" className="transition-colors hover:text-primary">Agentes IA</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text">Legal</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href={{ pathname: "/legal/terminos" }} className="transition-colors hover:text-primary">Términos de Servicio</Link></li>
              <li><Link href={{ pathname: "/legal/privacidad" }} className="transition-colors hover:text-primary">Política de Privacidad</Link></li>
              <li><Link href={{ pathname: "/legal/riesgo" }} className="transition-colors hover:text-primary">Aviso de riesgo</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-8 sm:flex-row">
          <p className="text-xs text-muted">
            &copy; {currentYear} MyInvestView. Todos los derechos reservados.
          </p>
          <p className="text-xs text-muted/60 italic">
            Los datos son orientativos y no constituyen asesoramiento financiero.
          </p>
          <div className="flex gap-4">
            {process.env.NEXT_PUBLIC_GITHUB_URL ? (
              <a
                href={process.env.NEXT_PUBLIC_GITHUB_URL}
                className="text-muted transition-colors hover:text-primary"
                aria-label="GitHub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
              </a>
            ) : null}
            {process.env.NEXT_PUBLIC_TWITTER_URL ? (
              <a
                href={process.env.NEXT_PUBLIC_TWITTER_URL}
                className="text-muted transition-colors hover:text-primary"
                aria-label="X (Twitter)"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="h-4 w-4" />
              </a>
            ) : null}
            {process.env.NEXT_PUBLIC_LINKEDIN_URL ? (
              <a
                href={process.env.NEXT_PUBLIC_LINKEDIN_URL}
                className="text-muted transition-colors hover:text-primary"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
