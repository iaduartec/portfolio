import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

app = FastAPI(title="Moon Dev Agents Bridge", version="0.1.0")

class ChatRequest(BaseModel):
    agent: str = "generic"
    prompt: str
    provider: str = "openai"  # openai|anthropic

class ChatResponse(BaseModel):
    reply: str
    provider: str

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(ROOT_DIR / ".env")

OPENAI_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")

async def call_openai(prompt: str) -> str:
    if not OPENAI_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY missing")
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_KEY}"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "Eres un agente de trading y research conciso."},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 300,
    }
    async with httpx.AsyncClient(timeout=40) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()

async def call_anthropic(prompt: str) -> str:
    if not ANTHROPIC_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY missing")
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": "claude-3-5-haiku-20241022",
        "max_tokens": 300,
        "system": "Eres un agente de trading y research conciso.",
        "messages": [{"role": "user", "content": prompt}],
    }
    async with httpx.AsyncClient(timeout=40) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        return "".join(block.get("text", "") for block in data.get("content", [])).strip()

async def call_ollama(prompt: str) -> str:
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": os.getenv("OLLAMA_MODEL", "llama3.1"),
        "messages": [
            {"role": "system", "content": "Eres un agente de trading y research conciso."},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=40) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        msg = data.get("message", {})
        return msg.get("content", "").strip()

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is empty")
    provider = req.provider.lower()
    if provider == "openai":
        reply = await call_openai(prompt)
    elif provider == "anthropic":
        reply = await call_anthropic(prompt)
    elif provider == "ollama":
        reply = await call_ollama(prompt)
    else:
        raise HTTPException(status_code=400, detail="unsupported provider")
    return ChatResponse(reply=reply, provider=provider)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app_server:app", host="0.0.0.0", port=int(os.getenv("AGENTS_PORT", "5050")), reload=False)
