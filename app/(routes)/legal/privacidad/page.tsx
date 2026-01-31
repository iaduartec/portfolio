import { Shell } from "@/components/layout/Shell";

export const metadata = {
  title: "Política de privacidad",
};

export default function PrivacidadPage() {
  return (
    <Shell>
      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Política de privacidad</h1>
        <p className="mt-4 text-muted leading-relaxed">
          Resumen: tu CSV se procesa para calcular posiciones y métricas. No vendemos tus datos.
        </p>
        <div className="mt-8 space-y-4 text-sm text-muted leading-relaxed">
          <p>
            Datos que podríamos procesar: transacciones/posiciones contenidas en el CSV, configuración de
            la app (p. ej. moneda) y métricas técnicas básicas para mejorar el servicio.
          </p>
          <p>
            Si quieres que esto sea totalmente GDPR-ready (base legal, DPA, retención, derechos ARCO,
            contacto del responsable), dime el escenario (personal vs empresa) y lo dejamos perfecto.
          </p>
        </div>
      </section>
    </Shell>
  );
}
