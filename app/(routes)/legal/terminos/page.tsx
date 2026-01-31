import { Shell } from "@/components/layout/Shell";

export const metadata = {
  title: "Términos de servicio",
};

export default function TerminosPage() {
  return (
    <Shell>
      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Términos de servicio</h1>
        <p className="mt-4 text-muted leading-relaxed">
          MyInvestView es una herramienta con fines educativos e informativos. Al usar la plataforma aceptas
          estos términos.
        </p>
        <div className="mt-8 space-y-4 text-sm text-muted leading-relaxed">
          <p>
            1) No ofrecemos asesoramiento financiero. 2) La información puede contener errores o retrasos.
            3) Eres responsable de tus decisiones de inversión. 4) Podemos modificar o retirar funcionalidades
            sin previo aviso.
          </p>
          <p>
            Si necesitas una versión legal completa (con jurisdicción, contacto, tratamiento de datos, etc.),
            dime el país/empresa y la preparo.
          </p>
        </div>
      </section>
    </Shell>
  );
}
