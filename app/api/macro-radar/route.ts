import { NextResponse } from "next/server";

export const runtime = "nodejs";

type MacroRadarItem = {
  title: string;
  link: string;
  publishedAt?: string;
  description?: string;
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
      };
    })
    .filter((item) => item.title && item.link)
    .slice(0, 6);
};

export async function GET() {
  try {
    const response = await fetch(FEED_URL, {
      next: { revalidate: 900 },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "No se pudo cargar el radar macro." }, { status: 502 });
    }

    const xml = await response.text();
    const items = parseFeed(xml);

    return NextResponse.json({
      source: "inversionesenelmundo-substack",
      items,
    });
  } catch (error) {
    console.error("Macro radar feed error:", error);
    return NextResponse.json({ error: "Error al cargar el radar macro." }, { status: 500 });
  }
}
