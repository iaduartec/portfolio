import { Shell } from "@/components/layout/Shell";

export const metadata = {
  title: "Aviso de riesgo",
};

export default function RiesgoPage() {
  return (
    <Shell>
      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Aviso de riesgo</h1>
        <p className="mt-4 text-muted leading-relaxed">
          Invertir conlleva riesgos, incluida la pérdida total o parcial del capital. Los resultados pasados no
          garantizan resultados futuros.
        </p>
        <div className="mt-8 space-y-4 text-sm text-muted leading-relaxed">
          <p>
            Los análisis y las salidas de IA pueden ser incorrectos o incompletos. Úsalos como apoyo, no como
            sustituto de criterio profesional.
          </p>
        </div>
      </section>
    </Shell>
  );
}
