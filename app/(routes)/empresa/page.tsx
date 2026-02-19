import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Clock3, MapPin, Phone, Mail } from "lucide-react";
import { Container } from "@/components/site/Container";
import { Section } from "@/components/site/Section";
import { SiteButton } from "@/components/site/SiteButton";
import { ServiceCard } from "@/components/site/ServiceCard";
import { CaseCard } from "@/components/site/CaseCard";
import {
  aboutCopy,
  caseItems,
  contactCopy,
  processItems,
  serviceItems,
  trustPoints,
} from "@/data/companyPortfolio";

export const metadata: Metadata = {
  title: "Empresa Tecnica | Redes, CCTV e IT",
  description:
    "Portfolio de servicios tecnicos para empresas: telecom, redes, CCTV, cableado e infraestructura IT con enfoque operativo y respuesta rapida.",
  alternates: {
    canonical: "/empresa",
  },
};

export default function EmpresaPage() {
  return (
    <div className="pb-20">
      <section className="relative overflow-hidden border-b border-border/60 py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-x-0 top-[-120px] z-[-1] mx-auto h-[340px] w-[900px] rounded-full bg-primary/15 blur-[130px]" />
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/90">Servicios Tecnicos</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight text-text sm:text-5xl lg:text-6xl">
                Instalamos y mantenemos infraestructura que no puede fallar.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                Para empresas que necesitan redes, CCTV y sistemas IT estables con ejecucion ordenada,
                documentacion clara y soporte tecnico real.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <SiteButton href="#contacto" size="lg" ariaLabel="Ir a la seccion de contacto">
                  Solicitar presupuesto
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </SiteButton>
                <SiteButton href="#servicios" variant="secondary" size="lg" ariaLabel="Ver servicios disponibles">
                  Ver servicios
                </SiteButton>
              </div>
            </div>

            <aside className="rounded-2xl border border-border/70 bg-surface/70 p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-text">Puntos de confianza</h2>
              <ul className="mt-4 space-y-4">
                {trustPoints.map((point) => (
                  <li key={point.label} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                    <div>
                      <p className="text-lg font-semibold text-text">{point.value}</p>
                      <p className="text-sm text-muted">{point.label}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </Container>
      </section>

      <Section
        id="servicios"
        eyebrow="Que hacemos"
        title="Servicios disenados para operar sin interrupciones"
        description="Cada bloque incluye alcance claro y un resultado medible para tu equipo."
        contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {serviceItems.map((service) => (
          <ServiceCard
            key={service.title}
            title={service.title}
            summary={service.summary}
            outcome={service.outcome}
            icon={service.icon}
          />
        ))}
      </Section>

      <Section
        id="proyectos"
        eyebrow="Trabajos"
        title="Proyectos recientes"
        description="Ejemplos resumidos de alcance y resultado obtenido en cliente."
        className="border-y border-border/50 bg-surface/30"
        contentClassName="grid gap-4 lg:grid-cols-3"
      >
        {caseItems.map((item) => (
          <CaseCard
            key={item.title}
            title={item.title}
            clientType={item.clientType}
            scope={item.scope}
            result={item.result}
          />
        ))}
      </Section>

      <Section
        id="proceso"
        eyebrow="Como trabajamos"
        title="Proceso en 4 pasos"
        description="Sin incertidumbre: cada fase tiene objetivo, entregable y validacion."
        contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {processItems.map((process) => (
          <article key={process.step} className="rounded-2xl border border-border/70 bg-surface/60 p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary/85">{process.step}</p>
            <h3 className="mt-3 text-base font-semibold text-text">{process.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{process.description}</p>
          </article>
        ))}
      </Section>

      <Section
        id="nosotros"
        eyebrow="Sobre nosotros"
        title={aboutCopy.title}
        description={aboutCopy.description}
        className="border-y border-border/50 bg-surface/25"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-border/70 bg-surface/65 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">Enfoque</p>
            <p className="mt-2 text-sm text-text">
              Priorizamos continuidad de servicio y claridad tecnica para que el cliente no dependa de una sola persona.
            </p>
          </article>
          <article className="rounded-xl border border-border/70 bg-surface/65 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">Entrega</p>
            <p className="mt-2 text-sm text-text">
              Cerramos cada intervencion con pruebas, checklist y documentacion util para operaciones futuras.
            </p>
          </article>
        </div>
      </Section>

      <Section
        id="contacto"
        eyebrow="Contacto"
        title="Hablemos de tu proyecto"
        description="Cuentanos el punto de partida y te devolvemos una propuesta tecnica concreta."
      >
        <div className="grid gap-5 rounded-2xl border border-border/70 bg-surface/70 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <p className="text-sm text-muted">
              Si necesitas una implantacion nueva o mejorar lo que ya tienes, podemos empezar con una visita tecnica.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <SiteButton href={`tel:${contactCopy.phone.replace(/\s+/g, "")}`} ariaLabel="Llamar ahora">
                <Phone className="h-4 w-4" aria-hidden="true" />
                Llamar
              </SiteButton>
              <SiteButton
                href={`mailto:${contactCopy.email}`}
                variant="secondary"
                ariaLabel="Enviar correo electronico"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Enviar email
              </SiteButton>
            </div>
          </div>

          <address className="not-italic text-sm text-text">
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{contactCopy.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{contactCopy.email}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{contactCopy.address}</span>
              </li>
              <li className="flex items-center gap-2 text-muted">
                <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Lunes a Viernes, 08:00 - 18:00</span>
              </li>
            </ul>
          </address>
        </div>
      </Section>
    </div>
  );
}
