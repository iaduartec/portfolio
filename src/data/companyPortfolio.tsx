import { Cable, Camera, Network, ServerCog, ShieldCheck, Wrench } from "lucide-react";
import { ReactNode } from "react";

export type TrustPoint = {
  value: string;
  label: string;
};

export type ServiceItem = {
  title: string;
  summary: string;
  outcome: string;
  icon: ReactNode;
};

export type CaseItem = {
  title: string;
  clientType: string;
  scope: string[];
  result: string;
};

export type ProcessItem = {
  step: string;
  title: string;
  description: string;
};

export const trustPoints: TrustPoint[] = [
  { value: "12+ anos", label: "Ejecutando instalaciones tecnicas" },
  { value: "<24 h", label: "Tiempo medio de respuesta" },
  { value: "99.2%", label: "Incidencias resueltas en primera visita" },
];

export const serviceItems: ServiceItem[] = [
  {
    title: "Redes y cableado estructurado",
    summary: "Diseno e instalacion de red para oficinas, naves y centros logistico-comerciales.",
    outcome: "Conexion estable, menos caidas y crecimiento ordenado por fases.",
    icon: <Network className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "CCTV y control de accesos",
    summary: "Circuito cerrado, grabacion centralizada y accesos segmentados por zona y horario.",
    outcome: "Mayor trazabilidad y reduccion de riesgos operativos.",
    icon: <Camera className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Infraestructura IT y telecom",
    summary: "Armarios, electronica de red, voz/datos y configuracion de enlaces criticos.",
    outcome: "Infraestructura lista para operar sin cuellos de botella.",
    icon: <Cable className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Soporte tecnico y mantenimiento",
    summary: "Mantenimiento preventivo y correctivo con reporte tecnico y seguimiento SLA.",
    outcome: "Menos interrupciones y control real del estado de tus sistemas.",
    icon: <Wrench className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Hardening y continuidad basica",
    summary: "Segmentacion, backup operacional y controles de acceso en servicios clave.",
    outcome: "Entorno mas seguro y recuperacion mas rapida ante incidentes.",
    icon: <ShieldCheck className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Virtualizacion y servidores",
    summary: "Consolidacion de cargas y despliegue de servicios internos con monitorizacion.",
    outcome: "Menor coste operativo y escalabilidad sin redisenar desde cero.",
    icon: <ServerCog className="h-5 w-5" aria-hidden="true" />,
  },
];

export const caseItems: CaseItem[] = [
  {
    title: "Modernizacion de red en planta industrial",
    clientType: "Cliente industrial",
    scope: [
      "Migracion de backbone y segmentacion por areas operativas.",
      "Actualizacion de armarios y etiquetado tecnico completo.",
      "Monitorizacion de enlaces troncales en tiempo real.",
    ],
    result: "Reduccion del 41% en incidencias de red en los primeros 90 dias.",
  },
  {
    title: "Sistema de CCTV para centro logistico",
    clientType: "Cliente logistica",
    scope: [
      "Cobertura de muelles, pasillos y zonas de carga critica.",
      "Politica de retencion y acceso seguro a grabaciones.",
      "Formacion de operativa para equipo interno.",
    ],
    result: "Tiempos de investigacion internos reducidos en mas de 50%.",
  },
  {
    title: "Estandarizacion multi-sede",
    clientType: "Pyme de servicios",
    scope: [
      "Plantillas de configuracion para sedes remotas.",
      "Inventario unico de equipamiento y procedimientos.",
      "Plan de mantenimiento trimestral con prioridades.",
    ],
    result: "Despliegues en nuevas sedes 2.3x mas rapidos.",
  },
];

export const processItems: ProcessItem[] = [
  {
    step: "01",
    title: "Diagnostico in situ",
    description: "Revisamos estado real, riesgos y capacidad actual. Entregamos alcance claro.",
  },
  {
    step: "02",
    title: "Propuesta tecnica",
    description: "Definimos arquitectura, fases, materiales y tiempos con criterios medibles.",
  },
  {
    step: "03",
    title: "Ejecucion controlada",
    description: "Implementamos por hitos para no parar tu operacion y documentamos cada cambio.",
  },
  {
    step: "04",
    title: "Validacion y soporte",
    description: "Probamos, entregamos checklist final y activamos mantenimiento preventivo.",
  },
];

export const aboutCopy = {
  title: "Equipo tecnico orientado a resultados operativos",
  description:
    "Trabajamos con un enfoque simple: cada proyecto debe mejorar disponibilidad, trazabilidad o tiempos de respuesta. Sin sobreingenieria y con documentacion util para el equipo del cliente.",
};

export const contactCopy = {
  phone: "+34 900 000 000",
  email: "contacto@empresa-tecnica.com",
  address: "Cobertura nacional | Base operativa en Madrid",
};
