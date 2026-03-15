import { NextResponse } from "next/server";

export const runtime = "nodejs";

type MacroRadarItem = {
  title: string;
  link: string;
  publishedAt?: string;
  description?: string;
  source?: string;
};

const FEED_URL = "https://inversionesenelmundo.substack.com/feed";

const decodeXmlEntities = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (value: string) =>
  decodeXmlEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const readTag = (block: string, tagName: string) => {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] ? stripHtml(match[1]) : "";
};

const parseFeed = (xml: string): MacroRadarItem[] => {
  const matches = xml.match(/<item>([\s\S]*?)<\/item>/gi) ?? [];
  return matches
    .map((itemBlock) => {
      const title = readTag(itemBlock, "title");
      const link = readTag(itemBlock, "link");
      const description = readTag(itemBlock, "description");
      const pubDate = readTag(itemBlock, "pubDate");
      const publishedAt = pubDate ? new Date(pubDate).toISOString() : undefined;
      return {
        title,
        link,
        description,
        publishedAt,
        source: "inversionesenelmundo-substack",
      };
    })
    .filter((item) => item.title && item.link)
    .slice(0, 12);
};

const dedupeItems = (items: MacroRadarItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title}|${item.link}`.toLowerCase();
    if (!item.title || !item.link || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;
    const [feedResult, yahooResult] = await Promise.allSettled([
      fetch(FEED_URL, {
        next: { revalidate: 900 },
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error("feed-unavailable");
        }
        return parseFeed(await response.text());
      }),
      fetch(`${origin}/api/yahoo?action=world-indices-news`, {
        next: { revalidate: 300 },
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error("yahoo-news-unavailable");
        }
        const payload = (await response.json()) as { items?: MacroRadarItem[] };
        return Array.isArray(payload.items)
          ? payload.items.map((item) => ({ ...item, source: item.source ?? "yahoo-finance" }))
          : [];
      }),
    ]);

    const feedItems = feedResult.status === "fulfilled" ? feedResult.value : [];
    const yahooItems = yahooResult.status === "fulfilled" ? yahooResult.value : [];
    const items = dedupeItems([...feedItems, ...yahooItems])
      .sort((a, b) => {
        const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return bTime - aTime;
      })
      .slice(0, 12);

    if (items.length === 0) {
      return NextResponse.json({ error: "No se pudo cargar el radar macro." }, { status: 502 });
    }

    return NextResponse.json({
      source: "mixed-macro-radar",
      items,
      meta: {
        sources: [
          feedItems.length > 0 ? "inversionesenelmundo-substack" : null,
          yahooItems.length > 0 ? "yahoo-finance-world-indices" : null,
        ].filter(Boolean),
      },
    });
  } catch (error) {
    console.error("Macro radar feed error:", error);
    return NextResponse.json({ error: "Error al cargar el radar macro." }, { status: 500 });
  }
}
