import { NextResponse } from "next/server";

const ALPHA_ENDPOINT = "https://www.alphavantage.co/query";

type AlphaSeries = Record<
  string,
  {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
    "5. volume": string;
  }
>;

const exchangeSuffixMap: Record<string, string> = {
  BME: ".MC",
  MIL: ".MI",
  XETR: ".DE",
  LSE: ".L",
  AMS: ".AS",
  BRU: ".BR",
  PAR: ".PA",
  STO: ".ST",
  SWX: ".SW",
  OSL: ".OL",
  HEL: ".HE",
  CPH: ".CO",
  ICE: ".IR",
  TSE: ".TO",
};

const exchangeRegionMap: Record<string, string> = {
  BME: "Spain",
  MIL: "Italy",
  XETR: "Germany",
  LSE: "United Kingdom",
  AMS: "Netherlands",
  BRU: "Belgium",
  PAR: "France",
  STO: "Sweden",
  SWX: "Switzerland",
  OSL: "Norway",
  HEL: "Finland",
  CPH: "Denmark",
  ICE: "Ireland",
  TSE: "Canada",
};

const buildUrl = (params: Record<string, string>) => {
  const query = new URLSearchParams(params);
  return `${ALPHA_ENDPOINT}?${query.toString()}`;
};

const fetchSeries = async (symbol: string, apiKey: string) => {
  const response = await fetch(
    buildUrl({
      function: "TIME_SERIES_DAILY",
      symbol,
      outputsize: "compact",
      apikey: apiKey,
    }),
    { next: { revalidate: 300 } }
  );
  const payload = await response.json();
  return { response, payload };
};

const findBestMatchSymbol = (
  matches: Array<Record<string, string>>,
  coreSymbol: string,
  regionHint?: string
) => {
  const normalized = coreSymbol.toUpperCase();
  const exact = matches.find((match) => match["1. symbol"]?.toUpperCase() === normalized);
  if (exact) return exact["1. symbol"];
  if (regionHint) {
    const byRegion = matches.find(
      (match) => match["4. region"]?.toLowerCase() === regionHint.toLowerCase()
    );
    if (byRegion) return byRegion["1. symbol"];
  }
  const starts = matches.find((match) =>
    match["1. symbol"]?.toUpperCase().startsWith(normalized)
  );
  return starts?.["1. symbol"] ?? matches[0]?.["1. symbol"];
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbolParam = searchParams.get("symbol");
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;

  if (!symbolParam) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ALPHAVANTAGE_API_KEY" }, { status: 500 });
  }

  const rawSymbol = symbolParam.trim();
  const [exchange, coreSymbol] = rawSymbol.includes(":")
    ? rawSymbol.split(":").map((part) => part.trim())
    : ["", rawSymbol];
  const needsSuffix = exchange && !coreSymbol.includes(".");
  const suffix = needsSuffix ? exchangeSuffixMap[exchange.toUpperCase()] ?? "" : "";
  const symbol = `${coreSymbol}${suffix}`.trim();
  if (!symbol) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const initial = await fetchSeries(symbol, apiKey);
  let payload = initial.payload as Record<string, unknown>;
  let series: AlphaSeries | undefined = payload["Time Series (Daily)"] as AlphaSeries | undefined;
  let resolvedSymbol = symbol;

  if (!series && !payload["Note"]) {
    const searchResponse = await fetch(
      buildUrl({
        function: "SYMBOL_SEARCH",
        keywords: coreSymbol,
        apikey: apiKey,
      }),
      { next: { revalidate: 300 } }
    );
    const searchPayload = (await searchResponse.json()) as Record<string, unknown>;
    const matches = Array.isArray(searchPayload?.bestMatches)
      ? (searchPayload.bestMatches as Array<Record<string, string>>)
      : [];
    const regionHint = exchange ? exchangeRegionMap[exchange.toUpperCase()] : undefined;
    const matchSymbol = matches.length > 0 ? findBestMatchSymbol(matches, coreSymbol, regionHint) : undefined;
    if (matchSymbol) {
      const retry = await fetchSeries(matchSymbol, apiKey);
      payload = retry.payload as Record<string, unknown>;
      series = payload["Time Series (Daily)"] as AlphaSeries | undefined;
      resolvedSymbol = matchSymbol;
    }
  }

  if (payload["Note"]) {
    return NextResponse.json({ error: payload["Note"] }, { status: 429 });
  }

  if (payload["Information"]) {
    return NextResponse.json({ error: payload["Information"] }, { status: 429 });
  }

  if (payload["Error Message"]) {
    return NextResponse.json(
      { error: payload["Error Message"], resolvedSymbol },
      { status: 502 }
    );
  }

  if (!series) {
    return NextResponse.json(
      {
        error: "No time series data",
        resolvedSymbol,
        searchedSymbol: symbol,
        payloadKeys: Object.keys(payload),
      },
      { status: 502 }
    );
  }

  const entries = Object.entries(series)
    .map(([time, value]) => ({
      time,
      open: Number(value["1. open"]),
      high: Number(value["2. high"]),
      low: Number(value["3. low"]),
      close: Number(value["4. close"]),
      volume: Number(value["5. volume"]),
    }))
    .filter((point) => Number.isFinite(point.open))
    .sort((a, b) => (a.time > b.time ? 1 : -1));

  const candles = entries.map((point) => ({
    time: point.time,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
  }));

  const volumes = entries.map((point) => ({
    time: point.time,
    value: point.volume,
    color: point.close >= point.open ? "rgba(0,192,116,0.35)" : "rgba(246,70,93,0.35)",
  }));

  return NextResponse.json({
    symbol: resolvedSymbol,
    candles,
    volumes,
    source: "alpha-vantage",
  });
}
