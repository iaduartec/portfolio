import { NextRequest, NextResponse } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_KEY2 = process.env.GEMINI_API_KEY2 || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const GEMINI_MODEL = "gemini-2.5-flash";

async function callGemini(prompt: string) {
  const keys = [GEMINI_API_KEY, GEMINI_API_KEY2].filter(Boolean);
  if (keys.length === 0) {
    return { ok: false, status: 500, body: { error: "GEMINI_API_KEY falta en el servidor." } };
  }
  let lastError: unknown;
  for (const apiKey of keys) {
    try {
      const model = createGoogleGenerativeAI({ apiKey })(GEMINI_MODEL);
      const { text } = await generateText({
        model,
        system: "Eres un agente de trading y research conciso.",
        prompt,
      });
      return { ok: true, status: 200, body: { text } };
    } catch (error) {
      lastError = error;
    }
  }
  const message = lastError instanceof Error ? lastError.message : "Error desconocido";
  return { ok: false, status: 500, body: { error: `Error en Gemini: ${message}` } };
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
  if (lower.includes("gemini_api_key")) {
    return "GEMINI_API_KEY falta en el servidor. Configura la clave o usa otro proveedor.";
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
    const { prompt, provider = "gemini" } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt vacío" }, { status: 400 });
    }
    const selectedProvider = String(provider || "gemini").toLowerCase();
    const response =
      selectedProvider === "anthropic"
        ? await callAnthropic(prompt)
        : selectedProvider === "gemini"
          ? await callGemini(prompt)
          : {
              ok: false,
              status: 400,
              body: { error: "Proveedor no soportado. Usa gemini o anthropic." },
            };

    if (!response.ok) {
      const message = normalizeError(toMessage(response.body)) || "Error en el backend de agentes";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    if (!response.body) {
      return NextResponse.json({ reply: "" });
    }

    if (selectedProvider === "gemini") {
      const text = response.body?.text;
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
