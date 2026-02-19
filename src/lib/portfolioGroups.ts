const ROBOADVISOR_ETF_SYMBOLS = new Set(["EXW1", "IS3K", "XUCD"]);

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
