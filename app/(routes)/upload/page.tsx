import { CsvDropzone } from "@/components/upload/CsvDropzone";
import { Shell } from "@/components/layout/Shell";

export default function UploadPage() {
  return (
    <Shell>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Datos</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Cargar transacciones</h1>
        <p className="max-w-3xl text-sm text-muted">
          Sube tu CSV de transacciones para reconstruir el portafolio. Usa PapaParse en cliente; pronto añadiremos lógica FIFO y P&L.
        </p>
      </div>
      <CsvDropzone />
    </Shell>
  );
}
