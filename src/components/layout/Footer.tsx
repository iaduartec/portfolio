import Link from "next/link";
import type { Route } from "next";
import { Github, Twitter, Linkedin } from "lucide-react";

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
              Plataforma de analisis de portafolio con IA, datos de mercado en tiempo real y visualizacion avanzada para tomar decisiones con mas claridad.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text">Plataforma</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href={{ pathname: "/empresa" as Route }} className="transition-colors hover:text-primary">Empresa</Link></li>
              <li><Link href="/" className="transition-colors hover:text-primary">Panel Principal</Link></li>
              <li><Link href="/portfolio" className="transition-colors hover:text-primary">Cartera</Link></li>
              <li><Link href="/lab" className="transition-colors hover:text-primary">Laboratorio Tecnico</Link></li>
              <li><Link href="/ai-agents" className="transition-colors hover:text-primary">Agentes IA</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text">Legal</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href={{ pathname: "/legal/terminos" }} className="transition-colors hover:text-primary">Terminos de servicio</Link></li>
              <li><Link href={{ pathname: "/legal/privacidad" }} className="transition-colors hover:text-primary">Politica de privacidad</Link></li>
              <li><Link href={{ pathname: "/legal/riesgo" }} className="transition-colors hover:text-primary">Aviso de riesgo</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-8 sm:flex-row">
          <p className="text-xs text-muted">
            &copy; {currentYear} MyInvestView. Todos los derechos reservados.
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
                aria-label="Twitter"
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
