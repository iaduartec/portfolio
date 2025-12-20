'use client';

import { DragEvent, useRef, useState } from "react";
import Papa, { ParseResult } from "papaparse";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/formatters";

type ParsedRow = Record<string, string | number>;

export function CsvDropzone() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      setError("Solo se admiten archivos CSV.");
      return;
    }
    setError(null);
    setFileName(file.name);
    setIsParsing(true);
    Papa.parse<ParsedRow>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results: ParseResult<ParsedRow>) => {
        setPreview(Array.isArray(results.data) ? results.data : []);
        setIsParsing(false);
      },
      error: (err) => {
        setError(err.message);
        setIsParsing(false);
      },
    });
  };

  const onDrop = (evt: DragEvent<HTMLDivElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    handleFiles(evt.dataTransfer.files);
  };

  const onBrowse = () => inputRef.current?.click();

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-panel">
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 bg-surface-muted/50 px-6 py-10 text-center"
        onDragOver={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }}
        onDrop={onDrop}
        onClick={onBrowse}
      >
        <p className="text-sm font-semibold text-text">Arrastra tu CSV aquí</p>
        <p className="text-xs text-muted">Formato esperado: date, ticker, type (BUY/SELL), quantity, price, fee</p>
        <Badge tone="default" className="bg-surface text-text">
          Usa PapaParse en cliente para leer el CSV
        </Badge>
        <button
          type="button"
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          Buscar archivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(evt) => handleFiles(evt.target.files)}
        />
        {fileName && (
          <p className="text-xs text-muted">
            Seleccionado: <span className="font-semibold text-text">{fileName}</span>
            {isParsing && " · leyendo..."}
          </p>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {preview.length > 0 && (
        <div className="mt-6 space-y-2 text-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-muted">Preview (primeras filas)</p>
          <div className="overflow-hidden rounded-lg border border-border/70">
            <table className="min-w-full divide-y divide-border/70 text-left text-xs">
              <thead className="bg-surface-muted/50 text-muted">
                <tr>
                  {Object.keys(preview[0] ?? {}).map((key) => (
                    <th key={key} className="px-3 py-2 font-semibold">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-text">
                {preview.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-muted/40">
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key} className="px-3 py-2">
                        {typeof value === "number" && key !== "quantity" ? formatCurrency(value) : String(value ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
