import { NextRequest, NextResponse } from "next/server";

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
};

type YahooNewsItem = {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
  relatedTickers?: string[];
  summary?: string;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeTicker = (value: string) =>
  value
    .split(":")
    .pop()
    ?.split(".")[0]
    ?.trim()
    .toUpperCase() ?? value.trim().toUpperCase();

const tokenize = (value: string) =>
  Array.from(
    new Set(
      normalizeText(value)
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    )
  );

const buildAliases = (ticker: string, quotes: YahooQuote[]) => {
  const normalizedTicker = normalizeTicker(ticker);
  const aliases = new Set<string>([ticker, normalizedTicker]);

  for (const quote of quotes) {
    const symbol = String(quote.symbol ?? "").trim();
    if (normalizeTicker(symbol) !== normalizedTicker) continue;

    [quote.shortname, quote.longname, symbol, normalizedTicker].forEach((value) => {
      if (!value) return;
      aliases.add(String(value).trim());
    });
  }

  return {
    ticker: normalizedTicker,
    tokens: Array.from(aliases).flatMap((alias) => tokenize(alias)),
  };
};

const isRelevantNews = (
  item: YahooNewsItem,
  context: ReturnType<typeof buildAliases>
) => {
  const relatedTickers = Array.isArray(item.relatedTickers)
    ? item.relatedTickers.map((value) => normalizeTicker(String(value ?? "")))
    : [];

  if (relatedTickers.includes(context.ticker)) {
    return true;
  }

  const haystack = normalizeText(`${item.title ?? ""} ${item.summary ?? ""}`);
  if (!haystack) return false;

  if (haystack.includes(context.ticker.toLowerCase())) {
    return true;
  }

  const matchedTokens = context.tokens.filter((token) => haystack.includes(token));
  return matchedTokens.length >= 2;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker parameter" }, { status: 400 });
  }

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      ticker
    )}&quotesCount=6&newsCount=12`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      news?: YahooNewsItem[];
      quotes?: YahooQuote[];
    };

    const context = buildAliases(ticker, Array.isArray(data.quotes) ? data.quotes : []);
    const filteredNews = (Array.isArray(data.news) ? data.news : [])
      .filter((item) => item.title && item.link)
      .filter((item) => isRelevantNews(item, context))
      .slice(0, 6);

    return NextResponse.json({ news: filteredNews });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
