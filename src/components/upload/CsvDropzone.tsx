'use client';

import { DragEvent, useRef, useState } from "react";
import Papa, { ParseResult } from "papaparse";
import { Badge } from "@/components/ui/badge";
import {
  convertCurrencyFrom,
  formatCurrency,
  inferCurrencyFromTicker,
} from "@/lib/formatters";
import { SESSION_ID_KEY, loadStoredTransactions, persistTransactions } from "@/lib/storage";
import { Transaction } from "@/types/transactions";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  normalizeCurrency,
  normalizeTicker,
  toTransaction,
  TICKER_SUFFIX_OVERRIDES,
  type ParsedRow,
} from "@/hooks/usePortfolioData.utils";

interface CsvDropzoneProps {
  // eslint-disable-next-line no-unused-vars
  onSave?: (rows: Transaction[]) => void;
}

const toFixedNumberKey = (value?: number) => {
  if (!Number.isFinite(value)) return "";
  return Number(value).toFixed(8);
};

const buildTransactionFingerprint = (tx: Transaction) =>
  [
    tx.date?.trim() ?? "",
    tx.ticker?.trim().toUpperCase() ?? "",
    tx.type ?? "",
    toFixedNumberKey(tx.quantity),
    toFixedNumberKey(tx.price),
    toFixedNumberKey(tx.fee),
    tx.currency ?? "",
    tx.name?.trim() ?? "",
  ].join("|");

export function CsvDropzone({ onSave }: CsvDropzoneProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const marketOptions = [
    { value: "XETR", label: "Xetra (XETR · Alemania)" },
    { value: "FRA", label: "Frankfurt (FRA · Alemania)" },
    { value: "STU", label: "Stuttgart (STU · Alemania)" },
    { value: "BME", label: "BME Madrid (BME · España)" },
    { value: "MIL", label: "Borsa Italiana (MIL · Italia)" },
    { value: "PAR", label: "Euronext Paris (PAR · Francia)" },
    { value: "AMS", label: "Euronext Amsterdam (AMS · Países Bajos)" },
    { value: "BRU", label: "Euronext Brussels (BRU · Bélgica)" },
    { value: "SWX", label: "SIX Swiss (SWX · Suiza)" },
    { value: "LSE", label: "London Stock Exchange (LSE · Reino Unido)" },
  ];
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ambiguousTickers, setAmbiguousTickers] = useState<string[]>([]);
  const [marketSelections, setMarketSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const DEFAULT_MARKET = "XETR";

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
        const ambiguous = Array.from(
          new Set(
            parsed
              .filter((tx) => tx.ticker)
              .map((tx) => {
                const ticker = tx.ticker.trim().toUpperCase();
                if (!ticker || ticker.includes(".") || ticker.includes(":")) return null;
                if (TICKER_SUFFIX_OVERRIDES[ticker]) return null;
                const inferred = tx.currency ?? inferCurrencyFromTicker(ticker);
                return inferred === "EUR" ? ticker : null;
              })
              .filter((ticker): ticker is string => Boolean(ticker))
          )
        ).sort();
        setPreview(rows.slice(0, 5));
        setTransactions(parsed);
        setAmbiguousTickers(ambiguous);
        setMarketSelections((prev) => {
          if (ambiguous.length === 0) return {};
          const next: Record<string, string> = {};
          ambiguous.forEach((ticker) => {
            next[ticker] = prev[ticker] ?? DEFAULT_MARKET;
          });
          return next;
        });
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
    if (ambiguousTickers.length > 0) {
      const unresolved = ambiguousTickers.filter((ticker) => !marketSelections[ticker]);
      if (unresolved.length > 0) {
        const sample = unresolved.slice(0, 6).join(", ");
        setError(`Selecciona un mercado para: ${sample}${unresolved.length > 6 ? "…" : ""}.`);
        return;
      }
    }
    const normalized = transactions.map((tx) => {
      const ticker = tx.ticker.trim().toUpperCase();
      if (
        ticker &&
        !ticker.includes(".") &&
        !ticker.includes(":") &&
        !TICKER_SUFFIX_OVERRIDES[ticker] &&
        marketSelections[ticker]
      ) {
        return { ...tx, ticker: normalizeTicker(`${marketSelections[ticker]}:${ticker}`) };
      }
      return tx;
    });
    const existing = loadStoredTransactions();
    const seen = new Set(existing.map((tx) => buildTransactionFingerprint(tx)));
    const appended = normalized.filter((tx) => {
      const key = buildTransactionFingerprint(tx);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const merged = [...existing, ...appended];
    const saved = persistTransactions(merged);
    if (!saved) {
      setError("No se pudieron guardar en localStorage.");
      return;
    }
    const sessionId = new Date().toISOString();
    window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    onSave?.(merged);
    setSuccess(
      `Anadidas ${appended.length} transacciones nuevas. Total guardadas: ${merged.length} (sesion ${sessionId}).`
    );
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
        {ambiguousTickers.length > 0 && (
          <p className="text-xs text-warning">
            Tickers sin mercado definido: se usara XETR por defecto (puedes cambiarlo):{" "}
            <span className="font-semibold text-text">
              {ambiguousTickers.slice(0, 8).join(", ")}
              {ambiguousTickers.length > 8 ? "…" : ""}
            </span>
          </p>
        )}
      </div>
      {ambiguousTickers.length > 0 && (
        <div className="mt-4 rounded-lg border border-border/70 bg-surface-muted/30 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-muted">
            Selecciona mercado por ticker
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ambiguousTickers.map((ticker) => (
              <label
                key={ticker}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-surface px-3 py-2 text-sm"
              >
                <span className="font-semibold text-text">{ticker}</span>
                <select
                  value={marketSelections[ticker] ?? ""}
                  onChange={(event) =>
                    setMarketSelections((prev) => ({
                      ...prev,
                      [ticker]: event.target.value,
                    }))
                  }
                  className="min-w-[220px] rounded-md border border-border/60 bg-surface px-2 py-1 text-xs text-text"
                >
                  <option value="">Selecciona mercado</option>
                  {marketOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-6 space-y-2 text-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-muted">Vista previa (primeras filas)</p>
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
                {preview.map((row, idx) => {
                  const rowTicker = String(
                    row.ticker ??
                      row.Ticker ??
                      row.symbol ??
                      row.Symbol ??
                      row.asset ??
                      row.Asset ??
                      ""
                  ).trim();
                  const rowCurrency =
                    normalizeCurrency(
                      row.currency ??
                        row.Currency ??
                        row.ccy ??
                        row.CCY ??
                        row.currency_code ??
                        row.Currency_code ??
                        row.moneda ??
                        row.Moneda
                    ) ?? inferCurrencyFromTicker(rowTicker);
                  return (
                    <tr key={idx} className="hover:bg-surface-muted/40">
                      {Object.entries(row).map(([key, value]) => {
                        const normalizedKey = key.toLowerCase().trim();
                        const isQuantity =
                          normalizedKey === "quantity" ||
                          normalizedKey === "qty" ||
                          normalizedKey === "cantidad";
                        const isRate = normalizedKey.includes("rate");
                        return (
                          <td key={key} className="px-3 py-2">
                            {typeof value === "number" && !isQuantity && !isRate
                              ? formatCurrency(
                                  convertCurrencyFrom(
                                    value,
                                    rowCurrency,
                                    currency,
                                    fxRate,
                                    baseCurrency
                                  ),
                                  currency
                                )
                              : String(value ?? "")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
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
          Anadir y combinar
        </button>
      </div>
    </div>
  );
}
