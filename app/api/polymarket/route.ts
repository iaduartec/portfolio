import { NextResponse } from "next/server";

type PolymarketRaw = {
  id?: string;
  question?: string;
  slug?: string;
  endDate?: string;
  volume24hr?: number;
  outcomes?: string;
  outcomePrices?: string;
};

type Market = {
  id: string;
  question: string;
  slug?: string;
  endDate?: string;
  volume24hr?: number;
  yesPrice?: number;
  noPrice?: number;
};

const parseJsonArray = (value?: string): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
};

const parsePriceArray = (value?: string): number[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => Number(item))
      .filter((n) => Number.isFinite(n))
      .map((n) => Math.max(0, Math.min(1, n)));
  } catch {
    return [];
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 5), 1), 20);

  try {
    const url = "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=50";
    const res = await fetch(url, { next: { revalidate: 90 } });
    const raw = (await res.json()) as PolymarketRaw[];
    const rows = Array.isArray(raw) ? raw : [];

    const markets = rows
      .map((row): Market | null => {
        const question = (row.question ?? "").trim();
        if (!question) return null;

        const outcomes = parseJsonArray(row.outcomes).map((o) => o.toLowerCase());
        const prices = parsePriceArray(row.outcomePrices);
        const yesIdx = outcomes.findIndex((o) => o === "yes");
        const noIdx = outcomes.findIndex((o) => o === "no");

        return {
          id: String(row.id ?? question),
          question,
          slug: row.slug,
          endDate: row.endDate,
          volume24hr: Number.isFinite(Number(row.volume24hr)) ? Number(row.volume24hr) : undefined,
          yesPrice: yesIdx >= 0 ? prices[yesIdx] : prices[0],
          noPrice: noIdx >= 0 ? prices[noIdx] : prices[1],
        };
      })
      .filter((m): m is Market => Boolean(m))
      .sort((a, b) => (b.volume24hr ?? 0) - (a.volume24hr ?? 0))
      .slice(0, limit);

    return NextResponse.json({ markets, source: "polymarket-gamma" });
  } catch {
    return NextResponse.json({ markets: [], source: "polymarket-gamma" }, { status: 200 });
  }
}

