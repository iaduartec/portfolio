import { NextResponse } from "next/server";

type InsiderTrade = {
  filingDate: string;
  tradeDate: string;
  ticker: string;
  tradeType: string;
  price?: number;
  qty?: number;
  value?: number;
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
      tradeType: cells[6],
      price: parseNumber(cells[7]),
      qty: parseNumber(cells[8]),
      value: parseNumber(cells[11]),
    });

    if (trades.length >= limit) break;
  }

  return trades;
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
          fd: "30",
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
        const res = await fetch(url, { next: { revalidate: 300 } });
        const html = await res.text();
        const trades = parseOpenInsiderRows(html, limit);
        return [ticker, trades] as const;
      })
    );
    const byTicker = Object.fromEntries(byTickerEntries);
    const firstTicker = tickers[0];
    return NextResponse.json({
      ticker: firstTicker,
      trades: byTicker[firstTicker] ?? [],
      byTicker,
      source: "openinsider",
    });
  } catch {
    const emptyByTicker = Object.fromEntries(tickers.map((ticker) => [ticker, [] as InsiderTrade[]]));
    const firstTicker = tickers[0];
    return NextResponse.json(
      {
        ticker: firstTicker,
        trades: [],
        byTicker: emptyByTicker,
        source: "openinsider",
      },
      { status: 200 }
    );
  }
}
