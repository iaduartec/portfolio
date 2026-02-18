import { NextResponse } from "next/server";
import { resolveYahooSymbol } from "@/lib/marketSymbols";

const exchangeYahooSuffixMap: Record<string, string> = {
  BME: ".MC",
  MIL: ".MI",
  XETR: ".DE",
  FRA: ".DE",
  LSE: ".L",
  SWX: ".SW",
};

const YAHOO_BASES = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const parseSymbols = (raw: string) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const normalizeSymbol = (symbol: string) => resolveYahooSymbol(symbol, exchangeYahooSuffixMap);

const fetchYahoo = async (path: string) => {
  let lastStatus = 0;
  for (const base of YAHOO_BASES) {
    const res = await fetch(`${base}${path}`, {
      next: { revalidate: 60 },
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (res.ok) return res.json();
    lastStatus = res.status;
    if (![401, 403, 429, 500, 502, 503].includes(res.status)) {
      break;
    }
  }
  throw new Error(`Yahoo request failed (${lastStatus || "unknown"})`);
};

const quoteFields = (row: Record<string, unknown>) => {
  const price = toNumber(
    row.regularMarketPrice ?? row.postMarketPrice ?? row.preMarketPrice ?? row.previousClose
  );
  const prevClose = toNumber(row.regularMarketPreviousClose ?? row.previousClose);
  const dayChange = price !== undefined && prevClose !== undefined ? price - prevClose : undefined;
  const dayChangePercent =
    dayChange !== undefined && prevClose !== undefined && prevClose !== 0
      ? (dayChange / prevClose) * 100
      : undefined;

  return {
    symbol: String(row.symbol ?? ""),
    name: String(row.longName ?? row.shortName ?? ""),
    exchange: String(row.fullExchangeName ?? row.exchange ?? ""),
    currency: String(row.currency ?? ""),
    marketState: String(row.marketState ?? ""),
    price,
    dayChange,
    dayChangePercent,
    marketCap: toNumber(row.marketCap),
    volume: toNumber(row.regularMarketVolume),
    avgVolume: toNumber(row.averageDailyVolume3Month),
    fiftyTwoWeekLow: toNumber(row.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: toNumber(row.fiftyTwoWeekHigh),
  };
};

const quoteSummaryModules = async (symbol: string, modules: string[]) => {
  const path = `/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=${encodeURIComponent(modules.join(","))}`;
  const json = await fetchYahoo(path);
  return json?.quoteSummary?.result?.[0] ?? null;
};

const chartHistory = async (symbol: string, range = "1mo", interval = "1d", events = "history") => {
  const path = `/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&events=${encodeURIComponent(
    events
  )}`;
  const json = await fetchYahoo(path);
  const result = json?.chart?.result?.[0];
  if (!result) return null;
  return result;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = new URL(request.url).origin;
  const action = (searchParams.get("action") ?? "price").trim().toLowerCase();
  const symbol = (searchParams.get("symbol") ?? "").trim();
  const symbolsParam = (searchParams.get("symbols") ?? "").trim();
  const query = (searchParams.get("query") ?? "").trim();

  const symbols = symbolsParam ? parseSymbols(symbolsParam) : symbol ? [symbol] : [];
  const normalizedSymbols = symbols.map(normalizeSymbol).filter(Boolean);

  try {
    if (action === "search") {
      if (!query) return NextResponse.json({ items: [] });
      const json = await fetchYahoo(
        `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
      );
      const quotes = Array.isArray(json?.quotes) ? json.quotes : [];
      const items = quotes.map((row: Record<string, unknown>) => ({
        symbol: String(row.symbol ?? ""),
        name: String(row.shortname ?? row.longname ?? ""),
        exchange: String(row.exchange ?? ""),
        type: String(row.quoteType ?? ""),
      }));
      return NextResponse.json({ action, query, items, source: "yahoo-finance" });
    }

    if (action === "compare" || action === "price" || action === "quote") {
      if (normalizedSymbols.length === 0) return NextResponse.json({ action, data: [] });
      let data: Array<ReturnType<typeof quoteFields>> = [];
      try {
        const json = await fetchYahoo(
          `/v7/finance/quote?symbols=${encodeURIComponent(normalizedSymbols.join(","))}`
        );
        const rows = Array.isArray(json?.quoteResponse?.result) ? json.quoteResponse.result : [];
        data = rows.map((row: Record<string, unknown>) => quoteFields(row));
      } catch {
        const fallback = await fetch(
          `${origin}/api/quotes?tickers=${encodeURIComponent(normalizedSymbols.join(","))}`,
          { next: { revalidate: 60 } }
        );
        const fallbackJson = await fallback.json();
        const rows = Array.isArray(fallbackJson?.quotes) ? fallbackJson.quotes : [];
        data = rows.map((row: Record<string, unknown>) => ({
          symbol: String(row.ticker ?? ""),
          name: String(row.name ?? ""),
          exchange: "",
          currency: "USD",
          marketState: "",
          price: toNumber(row.price),
          dayChange: toNumber(row.dayChange),
          dayChangePercent: toNumber(row.dayChangePercent),
          marketCap: undefined,
          volume: undefined,
          avgVolume: undefined,
          fiftyTwoWeekLow: undefined,
          fiftyTwoWeekHigh: undefined,
        }));
      }
      if (action === "price") {
        return NextResponse.json({
          action,
          data: data.map((row: { symbol: string; price?: number; dayChangePercent?: number }) => ({
            symbol: row.symbol,
            price: row.price,
            dayChangePercent: row.dayChangePercent,
          })),
          source: "yahoo-finance",
        });
      }
      return NextResponse.json({ action, data, source: "yahoo-finance" });
    }

    const normalized = normalizeSymbol(symbol);
    if (!normalized) {
      return NextResponse.json({ action, error: "Missing symbol" }, { status: 400 });
    }

    if (action === "fundamentals") {
      try {
        const summary = await quoteSummaryModules(normalized, [
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData",
        ]);
        if (!summary) return NextResponse.json({ action, data: null, source: "yahoo-finance" });
        const summaryDetail = summary.summaryDetail ?? {};
        const keyStats = summary.defaultKeyStatistics ?? {};
        const financialData = summary.financialData ?? {};
        return NextResponse.json({
          action,
          data: {
            symbol: normalized,
            trailingPE: toNumber(keyStats.trailingPE?.raw ?? summaryDetail.trailingPE?.raw),
            forwardPE: toNumber(summaryDetail.forwardPE?.raw),
            priceToBook: toNumber(keyStats.priceToBook?.raw),
            priceToSalesTtm: toNumber(summaryDetail.priceToSalesTrailing12Months?.raw),
            marketCap: toNumber(summaryDetail.marketCap?.raw),
            enterpriseToEbitda: toNumber(
              keyStats.enterpriseToEbitda?.raw ?? financialData.enterpriseToEbitda?.raw
            ),
            trailingEps: toNumber(keyStats.trailingEps?.raw),
            returnOnEquity: toNumber(financialData.returnOnEquity?.raw),
            returnOnAssets: toNumber(financialData.returnOnAssets?.raw),
            targetMeanPrice: toNumber(financialData.targetMeanPrice?.raw),
          },
          source: "yahoo-finance",
        });
      } catch {
        const fallback = await fetch(
          `${origin}/api/fundamentals?tickers=${encodeURIComponent(normalized)}`,
          { next: { revalidate: 300 } }
        );
        const fallbackJson = await fallback.json();
        const row = Array.isArray(fallbackJson?.data) ? fallbackJson.data[0] : null;
        return NextResponse.json({
          action,
          data: row
            ? {
                symbol: normalized,
                trailingPE: toNumber(row.pe),
                forwardPE: undefined,
                priceToBook: toNumber(row.pb),
                priceToSalesTtm: toNumber(row.ps),
                marketCap: undefined,
                enterpriseToEbitda: toNumber(row.evEbitda),
                trailingEps: undefined,
                returnOnEquity: undefined,
                returnOnAssets: undefined,
                targetMeanPrice: undefined,
              }
            : null,
          source: "yahoo-finance-fallback",
        });
      }
    }

    if (action === "earnings") {
      const summary = await quoteSummaryModules(normalized, [
        "calendarEvents",
        "earningsTrend",
        "earningsHistory",
      ]);
      if (!summary) return NextResponse.json({ action, data: null, source: "yahoo-finance" });
      return NextResponse.json({
        action,
        data: {
          symbol: normalized,
          nextEarningsDate:
            summary.calendarEvents?.earnings?.earningsDate?.[0]?.fmt ??
            summary.calendarEvents?.earnings?.earningsDate?.[0]?.raw,
          earningsAverage: toNumber(summary.calendarEvents?.earnings?.earningsAverage?.raw),
          earningsLow: toNumber(summary.calendarEvents?.earnings?.earningsLow?.raw),
          earningsHigh: toNumber(summary.calendarEvents?.earnings?.earningsHigh?.raw),
          history: summary.earningsHistory?.history ?? [],
          trend: summary.earningsTrend?.trend ?? [],
        },
        source: "yahoo-finance",
      });
    }

    if (action === "profile") {
      const summary = await quoteSummaryModules(normalized, ["assetProfile"]);
      const profile = summary?.assetProfile;
      return NextResponse.json({
        action,
        data: profile
          ? {
              symbol: normalized,
              sector: profile.sector,
              industry: profile.industry,
              fullTimeEmployees: profile.fullTimeEmployees,
              website: profile.website,
              address1: profile.address1,
              city: profile.city,
              state: profile.state,
              country: profile.country,
              longBusinessSummary: profile.longBusinessSummary,
            }
          : null,
        source: "yahoo-finance",
      });
    }

    if (action === "dividends") {
      const [summary, chart] = await Promise.all([
        quoteSummaryModules(normalized, ["summaryDetail"]),
        chartHistory(normalized, "1y", "1d", "div"),
      ]);
      const details = summary?.summaryDetail ?? {};
      const dividendsObj = chart?.events?.dividends ?? {};
      const history = Object.values(dividendsObj as Record<string, { date?: number; amount?: number }>).map(
        (d) => ({
          date: d.date,
          amount: toNumber(d.amount),
        })
      );
      return NextResponse.json({
        action,
        data: {
          symbol: normalized,
          dividendRate: toNumber(details.dividendRate?.raw),
          dividendYield: toNumber(details.dividendYield?.raw),
          exDividendDate: details.exDividendDate?.fmt ?? details.exDividendDate?.raw,
          payoutRatio: toNumber(details.payoutRatio?.raw),
          history,
        },
        source: "yahoo-finance",
      });
    }

    if (action === "ratings") {
      const summary = await quoteSummaryModules(normalized, [
        "recommendationTrend",
        "financialData",
        "upgradeDowngradeHistory",
      ]);
      return NextResponse.json({
        action,
        data: summary
          ? {
              symbol: normalized,
              recommendationMean: toNumber(summary.financialData?.recommendationMean?.raw),
              recommendationKey: summary.financialData?.recommendationKey,
              recommendationTrend: summary.recommendationTrend?.trend ?? [],
              upgradesDowngrades:
                summary.upgradeDowngradeHistory?.history?.slice?.(0, 20) ??
                summary.upgradeDowngradeHistory?.history ??
                [],
            }
          : null,
        source: "yahoo-finance",
      });
    }

    if (action === "options") {
      const json = await fetchYahoo(`/v7/finance/options/${encodeURIComponent(normalized)}`);
      const result = json?.optionChain?.result?.[0];
      if (!result) return NextResponse.json({ action, data: null, source: "yahoo-finance" });
      const underlyingPrice = toNumber(result.quote?.regularMarketPrice);
      const firstChain = result.options?.[0] ?? {};
      const calls = Array.isArray(firstChain.calls) ? firstChain.calls : [];
      const puts = Array.isArray(firstChain.puts) ? firstChain.puts : [];
      const rankByMoneyness = (rows: Array<Record<string, unknown>>) =>
        rows
          .map((row) => ({
            strike: toNumber(row.strike),
            bid: toNumber(row.bid),
            ask: toNumber(row.ask),
            volume: toNumber(row.volume),
            openInterest: toNumber(row.openInterest),
            impliedVolatility: toNumber(row.impliedVolatility),
            distance:
              underlyingPrice !== undefined && toNumber(row.strike) !== undefined
                ? Math.abs((toNumber(row.strike) as number) - underlyingPrice)
                : Number.POSITIVE_INFINITY,
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 8)
          .map(({ distance: _distance, ...rest }) => rest);

      return NextResponse.json({
        action,
        data: {
          symbol: normalized,
          expirationDates: result.expirationDates ?? [],
          underlyingPrice,
          calls: rankByMoneyness(calls),
          puts: rankByMoneyness(puts),
        },
        source: "yahoo-finance",
      });
    }

    if (action === "history") {
      const range = (searchParams.get("range") ?? "1mo").trim();
      const interval = (searchParams.get("interval") ?? "1d").trim();
      type HistoryPoint = {
        timestamp?: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
      };
      try {
        const chart = await chartHistory(normalized, range, interval, "history");
        if (!chart) return NextResponse.json({ action, data: null, source: "yahoo-finance" });
        const timestamps = Array.isArray(chart.timestamp) ? chart.timestamp : [];
        const quotes = chart.indicators?.quote?.[0] ?? {};
        const points: HistoryPoint[] = timestamps.map((ts: number, idx: number) => ({
          timestamp: ts,
          open: toNumber(quotes.open?.[idx]),
          high: toNumber(quotes.high?.[idx]),
          low: toNumber(quotes.low?.[idx]),
          close: toNumber(quotes.close?.[idx]),
          volume: toNumber(quotes.volume?.[idx]),
        }));
        return NextResponse.json({
          action,
          data: {
            symbol: normalized,
            range,
            interval,
            points: points.filter((p) => p.close !== undefined),
          },
          source: "yahoo-finance",
        });
      } catch {
        const fallback = await fetch(
          `${origin}/api/market/ohlc?symbol=${encodeURIComponent(normalized)}&range=${encodeURIComponent(
            range
          )}&interval=${encodeURIComponent(interval)}`,
          { next: { revalidate: 120 } }
        );
        const fallbackJson = await fallback.json();
        const points: HistoryPoint[] = Array.isArray(fallbackJson?.candles)
          ? fallbackJson.candles.map((c: Record<string, unknown>) => ({
              timestamp: toNumber(c.timestamp),
              open: toNumber(c.open),
              high: toNumber(c.high),
              low: toNumber(c.low),
              close: toNumber(c.close),
              volume: toNumber(c.volume),
            }))
          : [];
        return NextResponse.json({
          action,
          data: { symbol: normalized, range, interval, points },
          source: "yahoo-finance-fallback",
        });
      }
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { action, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 200 }
    );
  }
}
