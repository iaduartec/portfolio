const YAHOO_TICKER_OVERRIDES: Record<string, string> = {
  ENL: "ENEL.MI",
  "41L": "ROVI.MC",
  AJ3: "ANA.MC",
  OZTA: "GRF.MC",
  VHM: "SCYR.MC",
  REP: "REP.MC",
};

const TRADINGVIEW_TICKER_OVERRIDES: Record<string, string> = {
  ENL: "MIL:ENEL",
  "41L": "BME:ROVI",
  AJ3: "BME:ANA",
  OZTA: "BME:GRF",
  VHM: "BME:SCYR",
  REP: "BME:REP",
  FSS: "NYSE:FSS",
  RL: "NYSE:RL",
  AIZ: "NYSE:AIZ",
  NVDA: "NASDAQ:NVDA",
  AAPL: "NASDAQ:AAPL",
  MU: "NASDAQ:MU",
  GOOGL: "NASDAQ:GOOGL",
};

const TRADINGVIEW_SUFFIX_TO_EXCHANGE: Record<string, string> = {
  MC: "BME",
  MI: "MIL",
  DE: "XETR",
  PA: "PAR",
  AS: "AMS",
  BR: "BRU",
  SW: "SWX",
  L: "LSE",
  IR: "ICE",
  CO: "CPH",
  HE: "HEL",
  OL: "OSL",
  ST: "STO",
  TO: "TSE",
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

export const resolveTradingViewSymbol = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  if (!cleaned) return "";
  if (cleaned.includes(":")) return cleaned;
  if (cleaned.includes(".")) {
    const [rawSymbol, suffix] = cleaned.split(".", 2);
    const override = TRADINGVIEW_TICKER_OVERRIDES[rawSymbol];
    if (override) return override;
    const exchange = TRADINGVIEW_SUFFIX_TO_EXCHANGE[suffix];
    if (exchange) return `${exchange}:${rawSymbol}`;
    return cleaned;
  }
  return TRADINGVIEW_TICKER_OVERRIDES[cleaned] ?? cleaned;
};
