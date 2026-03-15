const ROBOADVISOR_ETF_SYMBOLS = new Set([
  "2B72",
  "79U0",
  "AMEL",
  "AMEM",
  "DBXJ",
  "EBUY",
  "EXI2",
  "EXW1",
  "IS3K",
  "IS3Q",
  "LEMA",
  "LGQK",
  "LYMS",
  "LYP5",
  "LYP6",
  "PRAJ",
  "UBUD",
  "WELK",
  "XDWI",
  "XDWT",
  "XUCD",
]);
const NON_INVESTMENT_TICKERS = new Set([
  "CASH",
  "EUR",
  "USD",
  "LIQUIDITY",
  "BALANCE",
  "ACCOUNT",
]);

const extractCoreTicker = (rawTicker: string) => {
  const cleaned = (rawTicker ?? "").trim().toUpperCase();
  if (!cleaned) return "";
  const withoutExchange = cleaned.includes(":") ? cleaned.split(":", 2)[1] : cleaned;
  return withoutExchange.includes(".") ? withoutExchange.split(".", 2)[0] : withoutExchange;
};

export const isFundTicker = (ticker: string) => {
  const cleaned = (ticker ?? "").trim().toUpperCase();
  if (!cleaned) return false;
  if (cleaned.startsWith("XETR:")) return true;
  if (cleaned.endsWith(".DE")) return true;
  return ROBOADVISOR_ETF_SYMBOLS.has(extractCoreTicker(cleaned));
};

export const isNonInvestmentTicker = (ticker: string) => {
  const core = extractCoreTicker(ticker);
  if (!core) return true;
  if (NON_INVESTMENT_TICKERS.has(core)) return true;
  if (core.startsWith("CASH")) return true;
  if (core.startsWith("BALANCE")) return true;
  if (core.startsWith("LIQ")) return true;
  return false;
};
