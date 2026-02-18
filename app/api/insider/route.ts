import { NextResponse } from "next/server";

type InsiderTrade = {
  filingDate: string;
  tradeDate: string;
  ticker: string;
  insiderName?: string;
  title?: string;
  tradeType: string;
  price?: number;
  qty?: number;
  value?: number;
};

type InsiderSummary = {
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  buyValue: number;
  sellValue: number;
  netValue: number;
};

const cleanHtml = (input: string) =>
  input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const parseNumber = (raw: string) => {
  const cleaned = raw.replace(/[^0-9+-.]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
};

const normalizeTradeType = (raw: string) => {
  const text = raw.toLowerCase();
  if (text.includes("purchase") || /\b[p]\b/i.test(raw)) return "P";
  if (text.includes("sale") || /\b[s]\b/i.test(raw)) return "S";
  return raw.trim() || "UNKNOWN";
};

const parseOpenInsiderRows = (html: string, limit: number): InsiderTrade[] => {
  const tableMatch = html.match(/<table[^>]*class="tinytable"[^>]*>[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];

  const rows = [...tableMatch[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const trades: InsiderTrade[] = [];

  for (const row of rows) {
    const rawCells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    const cells = rawCells.map((cell) => cleanHtml(cell));
    if (cells.length < 12) continue;
    if (!/\d{4}-\d{2}-\d{2}/.test(cells[1])) continue;
    const tickerMatch = rawCells[3]?.match(/>([A-Z][A-Z0-9.-]{0,14})<\/a>/i);
    const ticker = tickerMatch?.[1] ?? cells[3];

    trades.push({
      filingDate: cells[1],
      tradeDate: cells[2],
      ticker,
      insiderName: cells[4] || undefined,
      title: cells[5] || undefined,
      tradeType: normalizeTradeType(cells[6]),
      price: parseNumber(cells[7]),
      qty: parseNumber(cells[8]),
      value: parseNumber(cells[11]),
    });

    if (trades.length >= limit) break;
  }

  return trades;
};

const summarizeTrades = (trades: InsiderTrade[]): InsiderSummary => {
  let buyCount = 0;
  let sellCount = 0;
  let buyValue = 0;
  let sellValue = 0;

  for (const trade of trades) {
    const value = trade.value ?? 0;
    if (trade.tradeType === "P") {
      buyCount += 1;
      buyValue += value;
    } else if (trade.tradeType === "S") {
      sellCount += 1;
      sellValue += value;
    }
  }

  return {
    totalTrades: trades.length,
    buyCount,
    sellCount,
    buyValue,
    sellValue,
    netValue: buyValue - sellValue,
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers") ?? "";
  const singleTicker = (searchParams.get("ticker") ?? "").trim();
  const candidates = [
    ...tickersParam.split(",").map((t) => t.trim()),
    ...(singleTicker ? [singleTicker] : []),
  ];
  const normalized = Array.from(
    new Set(
      candidates
        .map((ticker) => ticker.toUpperCase())
        .map((ticker) => ticker.replace(/^[A-Z]+:/, ""))
        .map((ticker) => ticker.split(".")[0])
        .map((ticker) => ticker.replace(/[^A-Z0-9-]/g, ""))
        .filter((ticker) => /^[A-Z][A-Z0-9-]{0,14}$/.test(ticker))
    )
  );
  const tickers = normalized.length > 0 ? normalized.slice(0, 8) : ["NVDA"];
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 5), 1), 20);
  const fdParam = Number(searchParams.get("fd") ?? 30);
  const fdDays = [7, 30, 90].includes(fdParam) ? fdParam : 30;

  try {
    const byTickerEntries = await Promise.all(
      tickers.map(async (ticker) => {
        const params = new URLSearchParams({
          s: ticker,
          o: "",
          pl: "",
          ph: "",
          ll: "",
          lh: "",
          fd: String(fdDays),
          fdr: "",
          td: "0",
          tdr: "",
          xp: "1",
          xs: "1",
          xa: "1",
          vl: "",
          vh: "",
          ocl: "",
          och: "",
          sic1: "-1",
          sicl: "100",
          sich: "9999",
          isofficer: "1",
          isdirector: "1",
          istenpercent: "1",
          isother: "1",
          grp: "0",
          nfl: "",
          noh: "",
          cnt: String(Math.max(limit * 4, 20)),
          page: "1",
        });
        const url = `http://openinsider.com/screener?${params.toString()}`;
        const res = await fetch(url, {
          next: { revalidate: 300 },
          headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "text/html",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        const html = await res.text();
        const trades = parseOpenInsiderRows(html, limit);
        return [ticker, trades] as const;
      })
    );
    const byTicker = Object.fromEntries(byTickerEntries);
    const summaryByTicker = Object.fromEntries(
      Object.entries(byTicker).map(([ticker, trades]) => [ticker, summarizeTrades(trades)])
    );
    const firstTicker = tickers[0];
    return NextResponse.json({
      ticker: firstTicker,
      fd: fdDays,
      trades: byTicker[firstTicker] ?? [],
      byTicker,
      summary: summaryByTicker[firstTicker] ?? summarizeTrades([]),
      summaryByTicker,
      source: "openinsider",
    });
  } catch {
    const emptyByTicker = Object.fromEntries(tickers.map((ticker) => [ticker, [] as InsiderTrade[]]));
    const emptySummaryByTicker = Object.fromEntries(
      tickers.map((ticker) => [ticker, summarizeTrades([])])
    );
    const firstTicker = tickers[0];
    return NextResponse.json(
      {
        ticker: firstTicker,
        fd: fdDays,
        trades: [],
        byTicker: emptyByTicker,
        summary: emptySummaryByTicker[firstTicker],
        summaryByTicker: emptySummaryByTicker,
        source: "openinsider",
      },
      { status: 200 }
    );
  }
}
