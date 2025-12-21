import { NextRequest, NextResponse } from "next/server";

const SERVER_URL =
  process.env.AGENTS_SERVER_URL || (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:5050");

export async function POST(req: NextRequest) {
  try {
    if (!SERVER_URL) {
      return NextResponse.json(
        { error: "AGENTS_SERVER_URL no esta configurado en produccion." },
        { status: 500 }
      );
    }
    const { prompt, agent = "generic", provider = "openai" } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt vacío" }, { status: 400 });
    }

    const res = await fetch(`${SERVER_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, agent, provider }),
      next: { revalidate: 0 },
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const rawBody = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

    const toMessage = (body: any) => {
      if (!body) return "";
      if (typeof body === "string") return body;
      return body.error || body.detail || body.message || "";
    };

    const normalizeError = (msg: string) => {
      const lower = msg.toLowerCase();
      if (lower.includes("openai_api_key")) {
        return "OPENAI_API_KEY falta en el servidor de agentes. Configura la clave o usa otro proveedor (Anthropic/Ollama).";
      }
      if (lower.includes("anthropic") && lower.includes("api") && lower.includes("key")) {
        return "ANTHROPIC_API_KEY falta en el servidor de agentes. Configúrala o cambia de proveedor.";
      }
      return msg;
    };

    if (!res.ok) {
      const message = normalizeError(toMessage(rawBody)) || "Error en el backend de agentes";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    if (!rawBody) {
      return NextResponse.json({ reply: "" });
    }

    if (typeof rawBody === "string") {
      return NextResponse.json({ reply: rawBody });
    }

    return NextResponse.json(rawBody);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error inesperado" }, { status: 500 });
  }
}
