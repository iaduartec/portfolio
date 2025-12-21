import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

async function callOpenAI(prompt: string) {
  if (!OPENAI_API_KEY) {
    return { ok: false, status: 500, body: { error: "OPENAI_API_KEY falta en el servidor." } };
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un agente de trading y research conciso." },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
    }),
  });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const rawBody = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, body: rawBody };
}

async function callAnthropic(prompt: string) {
  if (!ANTHROPIC_API_KEY) {
    return { ok: false, status: 500, body: { error: "ANTHROPIC_API_KEY falta en el servidor." } };
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300,
      system: "Eres un agente de trading y research conciso.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const rawBody = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, body: rawBody };
}

const normalizeError = (msg: string) => {
  const lower = msg.toLowerCase();
  if (lower.includes("openai_api_key")) {
    return "OPENAI_API_KEY falta en el servidor. Configura la clave o usa otro proveedor.";
  }
  if (lower.includes("anthropic") && lower.includes("api") && lower.includes("key")) {
    return "ANTHROPIC_API_KEY falta en el servidor. Configurala o cambia de proveedor.";
  }
  return msg;
};

const toMessage = (body: any) => {
  if (!body) return "";
  if (typeof body === "string") return body;
  return body.error || body.detail || body.message || "";
};

export async function POST(req: NextRequest) {
  try {
    const { prompt, provider = "openai" } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt vacío" }, { status: 400 });
    }
    const selectedProvider = String(provider || "openai").toLowerCase();
    const response =
      selectedProvider === "anthropic"
        ? await callAnthropic(prompt)
        : selectedProvider === "openai"
          ? await callOpenAI(prompt)
          : {
              ok: false,
              status: 400,
              body: { error: "Proveedor no soportado. Usa openai o anthropic." },
            };

    if (!response.ok) {
      const message = normalizeError(toMessage(response.body)) || "Error en el backend de agentes";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    if (!response.body) {
      return NextResponse.json({ reply: "" });
    }

    if (selectedProvider === "openai") {
      const text = response.body?.choices?.[0]?.message?.content;
      return NextResponse.json({ reply: typeof text === "string" ? text.trim() : "" });
    }

    if (selectedProvider === "anthropic") {
      const parts = Array.isArray(response.body?.content) ? response.body.content : [];
      const text = parts.map((block: any) => block?.text || "").join("").trim();
      return NextResponse.json({ reply: text });
    }

    return NextResponse.json({ reply: "" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error inesperado" }, { status: 500 });
  }
}
