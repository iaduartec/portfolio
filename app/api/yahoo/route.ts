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

const fetchYahoo = async (path: string, ignoreError = false) => {
  let lastStatus = 0;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    "Referer": "https://finance.yahoo.com/",
    "Origin": "https://finance.yahoo.com"
  };

  for (const base of YAHOO_BASES) {
    try {
      const res = await fetch(`${base}${path}`, {
        next: { revalidate: 60 },
        headers
      });
      if (res.ok) return res.json();
      lastStatus = res.status;
      // If we get 401, Yahoo is asking for a crumb/session which we don't have.
      // We'll try common bases but if all fail, we handle it based on ignoreError.
      if (![401, 403, 429, 500, 502, 503].includes(res.status)) {
        break;
      }
    } catch (err) {
      if (!ignoreError) console.error(`fetchYahoo connection error to ${base}:`, err);
    }
  }
  if (ignoreError) return null;
  throw new Error(`Yahoo request failed (${lastStatus || "unknown"})`);
};

const fetchYahooNewsSearchHtml = async (query: string) => {
  const url = `https://news.search.yahoo.com/search?p=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Yahoo News search failed (${response.status})`);
  }
  return response.text();
};

const fetchYahooWorldIndicesHtml = async () => {
  const url = "https://finance.yahoo.com/markets/world-indices/";
  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Yahoo world indices failed (${response.status})`);
  }
  return response.text();
};

const decodeYahooRedirectUrl = (rawUrl: string) => {
  if (!rawUrl) return "";
  try {
    const match = rawUrl.match(/\/RU=([^/]+)\//);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
};

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

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

const newsFields = (row: Record<string, unknown>) => {
  const title = String(row.title ?? "").trim();
  const clickThroughUrl =
    row.clickThroughUrl && typeof row.clickThroughUrl === "object"
      ? String((row.clickThroughUrl as { url?: unknown }).url ?? "")
      : "";
  const link = String(row.link ?? clickThroughUrl ?? "").trim();
  const publishedAtRaw = toNumber(row.providerPublishTime);
  const summary = String(row.summary ?? "").trim();
  const relatedTickers = Array.isArray(row.relatedTickers)
    ? row.relatedTickers
        .map((ticker) => String(ticker ?? "").trim())
        .filter(Boolean)
    : [];

  return {
    title,
    publisher: String(row.publisher ?? "").trim(),
    link,
    publishedAt: publishedAtRaw ? new Date(publishedAtRaw * 1000).toISOString() : undefined,
    summary,
    relatedTickers,
  };
};

const normalizeNewsText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const tokenizeNewsQuery = (value: string) =>
  Array.from(
    new Set(
      normalizeNewsText(value)
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
    )
  );

const extractQueryHints = (query: string) => {
  const normalized = normalizeSymbol(query);
  const rawSymbol = query.split(":").pop()?.split(".")[0]?.trim().toUpperCase() ?? "";
  const normalizedSymbol = normalized.split(":").pop()?.split(".")[0]?.trim().toUpperCase() ?? rawSymbol;
  const queryTokens = tokenizeNewsQuery(query);
  const symbolTokens = [rawSymbol, normalizedSymbol].filter(Boolean);
  return { queryTokens, symbolTokens };
};

const computeNewsRelevance = (
  item: ReturnType<typeof newsFields>,
  hints: ReturnType<typeof extractQueryHints>,
) => {
  const haystack = normalizeNewsText(`${item.title} ${item.summary ?? ""}`);
  let score = 0;

  for (const symbol of hints.symbolTokens) {
    const normalizedSymbol = symbol.toLowerCase();
    if (!normalizedSymbol) continue;
    if (item.relatedTickers.some((ticker) => ticker.toUpperCase() === symbol)) {
      score += 8;
    }
    if (haystack.includes(normalizedSymbol)) {
      score += 5;
    }
  }

  for (const token of hints.queryTokens) {
    if (haystack.includes(token)) {
      score += token.length >= 4 ? 2 : 1;
    }
  }

  if (item.publishedAt) {
    const ageHours = (Date.now() - Date.parse(item.publishedAt)) / (1000 * 60 * 60);
    if (Number.isFinite(ageHours)) {
      if (ageHours <= 24) score += 4;
      else if (ageHours <= 72) score += 3;
      else if (ageHours <= 168) score += 2;
      else if (ageHours <= 336) score += 1;
    }
  }

  return score;
};

const dedupeNews = (items: Array<ReturnType<typeof newsFields>>) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title}|${item.link}`.toLowerCase();
    if (!item.title || !item.link || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const rankNewsItems = (items: Array<ReturnType<typeof newsFields>>, query: string, maxItems = 8) => {
  const hints = extractQueryHints(query);
  return dedupeNews(items)
    .map((item) => ({
      item,
      score: computeNewsRelevance(item, hints),
      publishedAtTs: item.publishedAt ? Date.parse(item.publishedAt) : 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.publishedAtTs - a.publishedAtTs;
    })
    .slice(0, maxItems)
    .map((entry) => entry.item);
};

const parseYahooAnchorsToNews = (
  html: string,
  options?: {
    maxItems?: number;
    hrefPattern?: RegExp;
    publisher?: string;
  },
) => {
  const articlePattern = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gm;
  const items: Array<ReturnType<typeof newsFields>> = [];
  const seen = new Set<string>();
  const hrefPattern = options?.hrefPattern ?? /^https?:\/\//i;
  let match: RegExpExecArray | null;

  while ((match = articlePattern.exec(html)) !== null) {
    const href = decodeYahooRedirectUrl(match[1] ?? "");
    const title = stripHtml(match[2] ?? "");

    if (!href || !title) continue;
    if (!hrefPattern.test(href)) continue;
    if (title.length < 20) continue;
    if (/privacy|cookie settings|terms|search results/i.test(title)) continue;

    const dedupeKey = `${title}|${href}`.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    items.push({
      title,
      publisher: options?.publisher ?? "Yahoo News",
      link: href,
      publishedAt: undefined,
      summary: "",
      relatedTickers: [],
    });

    if (items.length >= (options?.maxItems ?? 8)) break;
  }

  return items;
};

const parseYahooNewsSearchHtml = (html: string) =>
  parseYahooAnchorsToNews(html, {
    maxItems: 8,
    hrefPattern: /^https?:\/\//i,
    publisher: "Yahoo News",
  });

const parseYahooWorldIndicesHtml = (html: string) =>
  parseYahooAnchorsToNews(html, {
    maxItems: 8,
    hrefPattern: /^https:\/\/(finance|www)\.yahoo\.com\/news\//i,
    publisher: "Yahoo Finance",
  });

const quoteSummaryModules = async (symbol: string, modules: string[]) => {
  const path = `/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules.join(",")}`;
  try {
    const json = await fetchYahoo(path);
    return json?.quoteSummary?.result?.[0] ?? null;
  } catch (err) {
    console.error(`Snapshot summary modules failed for ${symbol}:`, err);
    if (modules.length > 2) {
      try {
        const essentialPath = `/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules.slice(0, 2).join(",")}`;
        const json = await fetchYahoo(essentialPath, true);
        return json?.quoteSummary?.result?.[0] ?? null;
      } catch (innerErr) {
        console.error(`Failed to fetch fallback modules for ${symbol}:`, innerErr);
        return null;
      }
    }
    return null;
  }
};

const fetchYahooChart = async (symbol: string) => {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  try {
    const json = await fetchYahoo(path, true);
    return json?.chart?.result?.[0] ?? null;
  } catch (err) {
    console.error(`Failed to fetch Yahoo chart for ${symbol}:`, err);
    return null;
  }
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

const getFallbackFundamentals = async (origin: string, normalized: string) => {
  const fallback = await fetch(
    `${origin}/api/fundamentals?tickers=${encodeURIComponent(normalized)}`,
    { next: { revalidate: 300 } }
  );
  const fallbackJson = await fallback.json();
  const row = Array.isArray(fallbackJson?.data) ? fallbackJson.data[0] : null;
  return row
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
    : null;
};

const shouldFetchChartFallback = (quote: ReturnType<typeof quoteFields> | null, summary: unknown) => {
  if (!summary) return true;
  if (!quote) return true;
  return (
    quote.price === undefined ||
    quote.dayChangePercent === undefined ||
    quote.fiftyTwoWeekLow === undefined ||
    quote.fiftyTwoWeekHigh === undefined ||
    quote.volume === undefined
  );
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

    if (action === "news") {
      const newsQuery = query || symbol || normalizedSymbols[0] || "";
      if (!newsQuery) return NextResponse.json({ action, query: "", items: [] });
      let items: Array<ReturnType<typeof newsFields>> = [];
      try {
        const html = await fetchYahooNewsSearchHtml(newsQuery);
        items = parseYahooNewsSearchHtml(html);
      } catch (error) {
        console.warn("Yahoo News search HTML fetch failed, falling back to Yahoo Finance news:", error);
      }

      if (items.length === 0) {
        const json = await fetchYahoo(
          `/v1/finance/search?q=${encodeURIComponent(newsQuery)}&quotesCount=0&newsCount=6`,
          true
        );
        const news = Array.isArray(json?.news) ? json.news : [];
        items = news
          .map((row: unknown) => newsFields((row ?? {}) as Record<string, unknown>))
          .filter((row: ReturnType<typeof newsFields>) => row.title && row.link);
      }

      const rankedItems = rankNewsItems(items, newsQuery, 8);

      return NextResponse.json({
        action,
        query: newsQuery,
        items: rankedItems,
        source: "yahoo-finance",
        meta: {
          totalCandidates: items.length,
          returnedItems: rankedItems.length,
        },
      });
    }

    if (action === "world-indices-news") {
      const html = await fetchYahooWorldIndicesHtml();
      const items = rankNewsItems(parseYahooWorldIndicesHtml(html), "world indices macro market", 8);
      return NextResponse.json({ action, items, source: "yahoo-finance-world-indices" });
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
        const receivedSymbols = new Set(
          data.map((row) => String(row.symbol ?? "").trim().toUpperCase()).filter(Boolean)
        );
        const missingSymbols = normalizedSymbols.filter(
          (target) => !receivedSymbols.has(String(target).trim().toUpperCase())
        );
        if (missingSymbols.length > 0) {
          const fallback = await fetch(
            `${origin}/api/quotes?tickers=${encodeURIComponent(missingSymbols.join(","))}`,
            { next: { revalidate: 60 } }
          );
          const fallbackJson = await fallback.json();
          const rows = Array.isArray(fallbackJson?.quotes) ? fallbackJson.quotes : [];
          const fallbackData = rows.map((row: Record<string, unknown>) => ({
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
          data = [...data, ...fallbackData];
        }
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

    if (action === "snapshot") {
      let q: ReturnType<typeof quoteFields> | null = null;
      try {
        const quoteJson = await fetchYahoo(`/v7/finance/quote?symbols=${encodeURIComponent(normalized)}`);
        const quoteRow = Array.isArray(quoteJson?.quoteResponse?.result) ? quoteJson.quoteResponse.result[0] : null;
        q = quoteRow ? quoteFields(quoteRow) : null;
      } catch (err) {
        console.warn(`Snapshot quote fetch failed for ${normalized}:`, err);
      }

      // Try fallback for quote if Yahoo main failed
      if (!q) {
        try {
          const fallback = await fetch(`${origin}/api/quotes?tickers=${encodeURIComponent(normalized)}`);
          const fallbackJson = await fallback.json();
          const row = Array.isArray(fallbackJson?.quotes) ? fallbackJson.quotes[0] : null;
          if (row) {
            q = {
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
            };
          }
        } catch (err) {
          console.error("Yahoo search error:", err);
        }
      }

      let summary: any = null;
      try {
        summary = await quoteSummaryModules(normalized, [
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData",
          "recommendationTrend",
          "assetProfile"
        ]);
      } catch (err) {
        console.error(`Snapshot summary modules failed for ${normalized}:`, err);
      }

      const chartData = shouldFetchChartFallback(q, summary) ? await fetchYahooChart(normalized) : null;
      const chartMeta = chartData?.meta;

      const details = summary?.summaryDetail ?? {};
      const keyStats = summary?.defaultKeyStatistics ?? {};
      const financialData = summary?.financialData ?? {};
      const profile = summary?.assetProfile ?? {};

      // If quote API failed, enrich q with chart data
      if (q && chartMeta) {
        q.name = q.name || chartMeta.longName || chartMeta.shortName || q.name;
        q.exchange = q.exchange || chartMeta.exchangeName || q.exchange;
        q.currency = q.currency || chartMeta.currency || q.currency;
        q.price = q.price ?? toNumber(chartMeta.regularMarketPrice);
        q.dayChange = q.dayChange ?? (chartMeta.regularMarketPrice && chartMeta.chartPreviousClose ? chartMeta.regularMarketPrice - chartMeta.chartPreviousClose : undefined);
        q.dayChangePercent =
          q.dayChangePercent ??
          (chartMeta.regularMarketPrice && chartMeta.chartPreviousClose
            ? ((chartMeta.regularMarketPrice - chartMeta.chartPreviousClose) / chartMeta.chartPreviousClose) * 100
            : undefined);
        q.fiftyTwoWeekLow = q.fiftyTwoWeekLow ?? toNumber(chartMeta.fiftyTwoWeekLow);
        q.fiftyTwoWeekHigh = q.fiftyTwoWeekHigh ?? toNumber(chartMeta.fiftyTwoWeekHigh);
        q.volume = q.volume ?? toNumber(chartMeta.regularMarketVolume);
        q.avgVolume = q.avgVolume ?? toNumber(chartMeta.regularMarketVolume);
      } else if (!q && chartMeta) {
        q = {
          symbol: normalized,
          name: chartMeta.longName || chartMeta.shortName || "",
          exchange: chartMeta.exchangeName || "",
          currency: chartMeta.currency || "USD",
          marketState: "",
          price: toNumber(chartMeta.regularMarketPrice),
          dayChange: (chartMeta.regularMarketPrice && chartMeta.chartPreviousClose ? chartMeta.regularMarketPrice - chartMeta.chartPreviousClose : undefined),
          dayChangePercent: (chartMeta.regularMarketPrice && chartMeta.chartPreviousClose ? ((chartMeta.regularMarketPrice - chartMeta.chartPreviousClose) / chartMeta.chartPreviousClose) * 100 : undefined),
          marketCap: undefined,
          volume: toNumber(chartMeta.regularMarketVolume),
          avgVolume: undefined,
          fiftyTwoWeekLow: toNumber(chartMeta.fiftyTwoWeekLow),
          fiftyTwoWeekHigh: toNumber(chartMeta.fiftyTwoWeekHigh),
        };
      }

      // If we got NO summary data from Yahoo's v10 API, try enrichment/fallback
      let fundamentals = {
        trailingPE: toNumber(keyStats.trailingPE?.raw ?? details.trailingPE?.raw),
        forwardPE: toNumber(details.forwardPE?.raw),
        priceToBook: toNumber(keyStats.priceToBook?.raw),
        priceToSalesTtm: toNumber(details.priceToSalesTrailing12Months?.raw),
        marketCap: toNumber(details.marketCap?.raw ?? q?.marketCap),
        enterpriseToEbitda: toNumber(keyStats.enterpriseToEbitda?.raw ?? financialData.enterpriseToEbitda?.raw),
        trailingEps: toNumber(keyStats.trailingEps?.raw),
        returnOnEquity: toNumber(financialData.returnOnEquity?.raw),
        returnOnAssets: toNumber(financialData.returnOnAssets?.raw),
        targetMeanPrice: toNumber(financialData.targetMeanPrice?.raw),
      };

      const hasFundamentals = Object.values(fundamentals).some(v => v !== undefined);
      if (!hasFundamentals) {
        try {
          const fallbackData = await getFallbackFundamentals(origin, normalized);
          if (fallbackData) {
            fundamentals = {
              ...fundamentals,
              trailingPE: fallbackData.trailingPE ?? fundamentals.trailingPE,
              priceToBook: fallbackData.priceToBook ?? fundamentals.priceToBook,
              enterpriseToEbitda: fallbackData.enterpriseToEbitda ?? fundamentals.enterpriseToEbitda,
              priceToSalesTtm: fallbackData.priceToSalesTtm ?? fundamentals.priceToSalesTtm,
            };
          }
        } catch (err) {
          console.error("Yahoo history error:", err);
        }
      }

      const data = {
        ticker: normalized,
        quote: q,
        fundamentals,
        ratings: summary ? {
          recommendationMean: toNumber(financialData.recommendationMean?.raw),
          recommendationKey: financialData.recommendationKey,
          recommendationTrend: summary?.recommendationTrend?.trend ?? [],
        } : null,
        dividends: summary ? {
          dividendYield: toNumber(details.dividendYield?.raw),
          payoutRatio: toNumber(details.payoutRatio?.raw),
        } : null,
        profile: summary ? {
          sector: profile.sector,
          industry: profile.industry,
          country: profile.country,
          website: profile.website,
          longBusinessSummary: profile.longBusinessSummary,
        } : null
      };

      return NextResponse.json({
        action,
        data,
        source: summary ? "yahoo-finance" : "yahoo-finance-partial",
        meta: {
          hasQuote: Boolean(q),
          hasSummary: Boolean(summary),
          usedChartFallback: Boolean(chartData),
          hasFundamentals,
        },
      });
    }

    if (action === "fundamentals") {
      try {
        const summary = await quoteSummaryModules(normalized, [
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData",
        ]);
        if (!summary) {
          const fallbackData = await getFallbackFundamentals(origin, normalized);
          return NextResponse.json({
            action,
            data: fallbackData,
            source: fallbackData ? "yahoo-finance-fallback" : "yahoo-finance",
          });
        }
        const summaryDetail = summary.summaryDetail ?? {};
        const keyStats = summary.defaultKeyStatistics ?? {};
        const financialData = summary.financialData ?? {};
        const data = {
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
        };
        const hasData = Object.entries(data).some(
          ([key, value]) => key !== "symbol" && value !== undefined && value !== null
        );
        if (!hasData) {
          const fallbackData = await getFallbackFundamentals(origin, normalized);
          return NextResponse.json({
            action,
            data: fallbackData,
            source: fallbackData ? "yahoo-finance-fallback" : "yahoo-finance",
          });
        }
        return NextResponse.json({
          action,
          data,
          source: "yahoo-finance",
        });
      } catch {
        const fallbackData = await getFallbackFundamentals(origin, normalized);
        return NextResponse.json({
          action,
          data: fallbackData,
          source: fallbackData ? "yahoo-finance-fallback" : "yahoo-finance-unavailable",
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
      try {
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
      } catch {
        return NextResponse.json({
          action,
          data: {
            symbol: normalized,
            dividendRate: undefined,
            dividendYield: undefined,
            exDividendDate: undefined,
            payoutRatio: undefined,
            history: [],
          },
          source: "yahoo-finance-unavailable",
        });
      }
    }

    if (action === "ratings") {
      try {
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
      } catch {
        return NextResponse.json({
          action,
          data: {
            symbol: normalized,
            recommendationMean: undefined,
            recommendationKey: undefined,
            recommendationTrend: [],
            upgradesDowngrades: [],
          },
          source: "yahoo-finance-unavailable",
        });
      }
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
            points: points.filter((p) => p.close !== undefined && p.close > 0),
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
          ? fallbackJson.candles.map((c: Record<string, unknown>) => {
              const dateStr = String(c.time || c.date || "");
              const ts = dateStr.includes("-")
                ? Date.parse(dateStr)
                : toNumber(c.timestamp ?? c.time);
              return {
                timestamp: ts && !isNaN(ts) ? (ts < 1_000_000_000_000 ? ts * 1000 : ts) / 1000 : undefined,
                open: toNumber(c.open),
                high: toNumber(c.high),
                low: toNumber(c.low),
                close: toNumber(c.close),
                volume: toNumber(c.volume),
              };
            })
          : [];
        return NextResponse.json({
          action,
          data: {
            symbol: normalized,
            range,
            interval,
            points: points.filter((p) => p.timestamp && p.close && p.close > 0),
          },
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
