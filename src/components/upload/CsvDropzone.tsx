'use client';

import { DragEvent, useRef, useState } from "react";
import Papa, { ParseResult } from "papaparse";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { SESSION_ID_KEY, persistTransactions } from "@/lib/storage";
import { Transaction, TransactionType } from "@/types/transactions";

type ParsedRow = Record<string, string | number>;

const fieldAliases: Record<keyof Transaction, string[]> = {
  date: ["date", "closing time", "close_time", "datetime", "trade_date"],
  ticker: ["ticker", "symbol", "asset", "isin"],
  type: ["type", "side", "action"],
  quantity: ["quantity", "qty", "shares", "units", "qty shares"],
  price: ["price", "fill price", "fill_price", "avg_price", "cost"],
  fee: ["fee", "fees", "commission", "broker fee"],
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickField = (row: ParsedRow, candidates: string[]) => {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    const normalizedKey = key.toLowerCase().trim();
    if (candidates.includes(normalizedKey)) return value;
  }
  return undefined;
};

const normalizeType = (raw: string): TransactionType => {
  const upper = raw.toUpperCase();
  if (upper === "BUY" || upper === "SELL") return upper;
  if (upper === "DIVIDEND" || upper === "DIV" || upper === "DIVS") return "DIVIDEND";
  if (upper === "FEE" || upper === "COMMISSION") return "FEE";
  return "OTHER";
};

interface CsvDropzoneProps {
  // eslint-disable-next-line no-unused-vars
  onSave?: (rows: Transaction[]) => void;
}

export function CsvDropzone({ onSave }: CsvDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const toTransaction = (row: ParsedRow): Transaction | null => {
    const dateRaw = pickField(row, fieldAliases.date.map((a) => a.toLowerCase()));
    const tickerRaw = pickField(row, fieldAliases.ticker.map((a) => a.toLowerCase()));
    const typeRaw = pickField(row, fieldAliases.type.map((a) => a.toLowerCase()));
    const qtyRaw = pickField(row, fieldAliases.quantity.map((a) => a.toLowerCase()));
    const priceRaw = pickField(row, fieldAliases.price.map((a) => a.toLowerCase()));
    const feeRaw = pickField(row, fieldAliases.fee.map((a) => a.toLowerCase()));

    const date = dateRaw ? String(dateRaw).trim() : "";
    const ticker = tickerRaw ? String(tickerRaw).trim().toUpperCase() : "";
    const type = typeRaw ? normalizeType(String(typeRaw).trim()) : "OTHER";
    const quantity = normalizeNumber(qtyRaw) ?? 0;
    const price = normalizeNumber(priceRaw) ?? 0;
    const fee = feeRaw !== undefined ? normalizeNumber(feeRaw) ?? undefined : undefined;

    if (!date || !ticker) {
      return null;
    }

    return { date, ticker, type, quantity, price, fee };
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      setError("Solo se admiten archivos CSV.");
      return;
    }
    setError(null);
    setSuccess(null);
    setFileName(file.name);
    setIsParsing(true);
    Papa.parse<ParsedRow>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<ParsedRow>) => {
        const rows = Array.isArray(results.data) ? results.data : [];
        const parsed = rows.map(toTransaction).filter((row): row is Transaction => Boolean(row));
        setPreview(rows.slice(0, 5));
        setTransactions(parsed);
        if (parsed.length === 0) {
          setError(
            "No se pudo leer ninguna transacción válida. Revisa columnas: date/closing time, ticker/symbol, side(type)=BUY|SELL|DIVIDEND|FEE, qty, price, fee (opcional)."
          );
        }
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

  const handleSave = () => {
    if (!transactions.length) return;
    const saved = persistTransactions(transactions);
    if (!saved) {
      setError("No se pudieron guardar en localStorage.");
      return;
    }
    const sessionId = new Date().toISOString();
    window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    onSave?.(transactions);
    setSuccess(`Guardadas ${transactions.length} transacciones en local (sesión ${sessionId}).`);
  };

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
        {success && <p className="text-xs text-success">{success}</p>}
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

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted">
          Transacciones detectadas:{" "}
          <span className="font-semibold text-text">{transactions.length}</span>
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={!transactions.length}
          className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guardar en local
        </button>
      </div>
    </div>
  );
}
