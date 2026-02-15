"use client";

import React, { useState, useRef, useEffect } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { StockCard } from "./stock-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, AlertCircle, MessageCircle, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemoizedMarkdown } from "@/components/ai/memoized-markdown";
import { usePortfolioData } from "@/hooks/usePortfolioData";

const chat = new Chat({
  transport: new DefaultChatTransport({ api: "/api/ai" }),
});

export function AIChat() {
  const portfolio = usePortfolioData();
  const [isMinimized, setIsMinimized] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { messages, status, error, sendMessage } = useChat({
    chat,
    experimental_throttle: 50,
    onError: (error: Error) => {
      console.error("AI Chat Error:", error);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, status]);

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(41,98,255,0.2)] backdrop-blur-xl transition-all hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
        aria-label="Abrir chat de Gemini"
      >
        <Sparkles size={18} className="text-primary animate-pulse" />
        Consultar IA
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[600px] w-[92vw] max-w-[400px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface/80 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 sm:bottom-6 sm:right-6 sm:w-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-md rounded-full animate-pulse" />
            <div className="relative rounded-xl bg-primary/10 p-2 text-primary border border-primary/20">
              <Bot size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Analista Gemini</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Sincronizado</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="rounded-xl border border-white/5 bg-white/5 p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white"
        >
          <Minus size={18} />
        </button>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-6">
          {messages.length === 0 && !error && (
            <div className="text-center py-12 px-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary/40">
                <MessageCircle size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">¿En qué puedo ayudarte hoy?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Puedo analizar tu rentabilidad, detectar riesgos o darte información sobre cualquier activo.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-4">
                {["¿Cómo va mi cartera hoy?", "¿Es buen momento para comprar AAPL?", "Analiza mi exposición al riesgo"].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage({ text: q })}
                    className="text-left py-2 px-3 rounded-lg bg-white/5 border border-white/5 text-[11px] text-white/70 hover:bg-white/10 hover:border-white/10 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <AlertCircle size={20} className="shrink-0" />
              <span className="font-medium">Error de conexión. Verifica tu API Key de Gemini.</span>
            </div>
          )}

          {messages.map((m: any) => {
            const textParts = Array.isArray(m.parts)
              ? m.parts.filter((part: any) => part.type === "text")
              : [];
            const partsText = textParts.map((part: any) => part.text).join("\n");
            const messageText =
              partsText ||
              (typeof m.content === "string" ? m.content : "") ||
              (typeof m.text === "string" ? m.text : "");

            const toolParts = Array.isArray(m.parts)
              ? m.parts.filter((part: any) => typeof part.type === "string" && part.type.startsWith("tool-"))
              : [];

            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-3 text-sm",
                  m.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                    m.role === "user"
                      ? "bg-primary text-white border-primary-foreground/20"
                      : "bg-surface border-white/10 text-primary"
                  )}
                >
                  {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div className={cn("flex flex-col gap-3", m.role === "user" ? "max-w-[75%]" : "max-w-[85%]")}>
                  {messageText && (
                    <div
                      className={cn(
                        "p-4 rounded-2xl leading-relaxed shadow-sm",
                        m.role === "user"
                          ? "bg-primary text-white rounded-tr-none font-medium"
                          : "bg-white/5 border border-white/10 text-white/90 rounded-tl-none ai-analysis-output"
                      )}
                    >
                      <MemoizedMarkdown id={m.id} content={messageText} />
                    </div>
                  )}

                  {toolParts.map((toolPart: any) => {
                    if (toolPart.type !== "tool-showStock") return null;
                    const toolCallId = toolPart.toolCallId ?? toolPart.id ?? "tool-call";

                    if (toolPart.state === "output-available" && toolPart.output) {
                      return (
                        <div key={toolCallId} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <StockCard {...toolPart.output} />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={toolCallId}
                        className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground animate-pulse p-4 border border-dashed border-white/10 rounded-2xl bg-white/3"
                      >
                        <Bot size={14} className="text-primary" />
                        EJECUTANDO ANALISIS DE VALOR...
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <MessageInput
        isLoading={isLoading}
        sendMessage={sendMessage}
        portfolioContext={{
          holdings: portfolio.holdings,
          summary: portfolio.summary,
          realizedTrades: portfolio.realizedTrades,
        }}
      />
    </div>
  );
}

function MessageInput({
  isLoading,
  sendMessage,
  portfolioContext,
}: {
  isLoading: boolean;
  // eslint-disable-next-line no-unused-vars
  sendMessage: (options: { text: string; data?: any }) => Promise<any>;
  portfolioContext: any;
}) {
  const [input, setInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");

    try {
      await sendMessage({
        text: userMessage,
        data: {
          portfolio: {
            holdings: portfolioContext.holdings,
            positions: portfolioContext.holdings,
            summary: portfolioContext.summary,
            realizedTrades: portfolioContext.realizedTrades,
          },
        },
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      setInput(userMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-white/5 bg-white/3 flex gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="¿Consutar a Gemini?"
        className="flex-1 bg-surface border-white/10 rounded-xl focus-visible:ring-primary h-12"
        disabled={isLoading}
      />
      <Button
        type="submit"
        size="icon"
        disabled={isLoading || !input.trim()}
        className="h-12 w-12 rounded-xl"
      >
        <Send size={20} className={cn(isLoading && "animate-pulse")} />
      </Button>
    </form>
  );
}
