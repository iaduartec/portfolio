const YAHOO_TICKER_OVERRIDES: Record<string, string> = {
  ENL: "ENEL.MI",
  "41L": "ROVI.MC",
  AJ3: "ANA.MC",
  OZTA: "GRF.MC",
  VHM: "SCYR.MC",
  REP: "REP.MC",
};

const EXCHANGE_ALIAS_MAP: Record<string, string> = {
  BIT: "MIL",
  MILAN: "MIL",
  BMEF: "BME",
  BOL: "BME",
  ETR: "XETR",
  XETRA: "XETR",
  TRADEGATE: "XETR",
  EPA: "PAR",
  EBR: "BRU",
  LON: "LSE",
  SIX: "SWX",
};

export const resolveExchange = (exchange: string) => {
  const cleaned = exchange.trim().toUpperCase();
  return EXCHANGE_ALIAS_MAP[cleaned] ?? cleaned;
};

export const resolveYahooSymbol = (
  ticker: string,
  exchangeSuffixMap: Record<string, string>
) => {
  const cleaned = ticker.trim().toUpperCase();
  if (!cleaned) return "";
  const override = YAHOO_TICKER_OVERRIDES[cleaned];
  if (override) return override;
  const [exchangeRaw, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  if (rawSymbol.includes(".")) return rawSymbol;
  const exchange = exchangeRaw ? resolveExchange(exchangeRaw) : "";
  const suffix = exchange ? exchangeSuffixMap[exchange] ?? "" : "";
  return `${rawSymbol}${suffix}`;
};
