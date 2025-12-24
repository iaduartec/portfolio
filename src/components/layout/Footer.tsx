import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-surface/50 backdrop-blur-sm mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-4 lg:gap-12">
          <div className="md:col-span-2">
            <Link href="/" className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
              <span className="text-accent">MyInvestView</span>
            </Link>
            <p className="max-w-xs text-sm text-muted">
              Plataforma avanzada de análisis de portafolio potenciada por inteligencia artificial y datos de mercado en tiempo real.
            </p>
          </div>
          
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text">Plataforma</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">Panel Principal</Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-accent transition-colors">Mi Portafolio</Link>
              </li>
              <li>
                <Link href="/lab" className="hover:text-accent transition-colors">Laboratorio Técnico</Link>
              </li>
              <li>
                <Link href="/ai-agents" className="hover:text-accent transition-colors">Agentes IA</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text">Legal</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="#" className="hover:text-accent transition-colors">Términos de Servicio</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-accent transition-colors">Política de Privacidad</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-accent transition-colors">Aviso de Riesgo</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-xs text-muted">
            &copy; {currentYear} MyInvestView. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-muted hover:text-accent transition-colors" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
            <a href="#" className="text-muted hover:text-accent transition-colors" aria-label="Twitter">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="#" className="text-muted hover:text-accent transition-colors" aria-label="LinkedIn">
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
