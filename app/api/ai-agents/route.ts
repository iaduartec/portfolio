import { NextRequest, NextResponse } from "next/server";

const SERVER_URL = process.env.AGENTS_SERVER_URL || "http://127.0.0.1:5050";

export async function POST(req: NextRequest) {
  try {
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

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || "Error en el backend de agentes" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error inesperado" }, { status: 500 });
  }
}
