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
        className="surface-card fixed bottom-3 right-3 z-50 inline-flex h-11 w-11 items-center justify-center rounded-2xl border-primary/16 text-text shadow-elevated transition-colors duration-200 hover:border-primary/28 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65 sm:bottom-6 sm:right-6 sm:h-auto sm:w-auto sm:gap-3 sm:px-5 sm:py-3"
        aria-label="Abrir chat de Gemini"
      >
        <Sparkles size={16} className="text-primary" aria-hidden="true" />
        <span className="hidden text-sm font-semibold sm:inline">Consultar IA</span>
      </button>
    );
  }

  return (
    <div className="surface-card fixed bottom-3 right-3 z-50 flex h-[78vh] w-[calc(100vw-1.5rem)] max-w-[400px] flex-col overflow-hidden rounded-[1.75rem] sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-[400px]">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-surface/45 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-primary/16 bg-primary/10 p-2 text-primary">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Analista IA</h3>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Sincronizado</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="rounded-xl border border-border/70 bg-surface/60 p-2 text-text-tertiary transition-colors duration-200 hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65"
          aria-label="Minimizar chat"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-6">
          {messages.length === 0 && !error && (
            <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/12 bg-primary/8 text-primary/70">
                <MessageCircle size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text">¿En qué puedo ayudarte hoy?</p>
                <p className="text-xs leading-relaxed text-text-tertiary">
                  Puedo analizar tu rentabilidad, detectar riesgos o darte información sobre cualquier activo.
                </p>
              </div>
              <div className="mt-4 flex w-full flex-col gap-2">
                {["¿Cómo va mi cartera hoy?", "¿Es buen momento para comprar AAPL?", "Analiza mi exposición al riesgo"].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage({ text: q })}
                    className="rounded-xl border border-border/70 bg-surface/60 px-3 py-2 text-left text-[11px] text-text-secondary transition-colors duration-200 hover:border-primary/18 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-danger/18 bg-danger/[0.08] p-4 text-sm text-danger">
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
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                    m.role === "user"
                      ? "border-primary/20 bg-primary text-background"
                      : "border-border/70 bg-surface text-primary"
                  )}
                >
                  {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div className={cn("flex flex-col gap-3", m.role === "user" ? "max-w-[75%]" : "max-w-[85%]")}>
                  {messageText && (
                    <div
                      className={cn(
                        "rounded-2xl p-4 leading-relaxed shadow-sm",
                        m.role === "user"
                          ? "rounded-tr-none bg-primary text-background font-medium"
                          : "ai-analysis-output rounded-tl-none border border-border/70 bg-surface/60 text-text"
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
                        className="flex animate-pulse items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-surface/35 p-4 text-[11px] font-semibold text-text-tertiary"
                      >
                        <Bot size={14} className="text-primary" />
                        Ejecutando análisis de valor...
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
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border/70 bg-surface/40 p-4">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="¿Consultar a Gemini?"
        className="h-12 flex-1 rounded-xl"
        disabled={isLoading}
        name="gemini_prompt"
        autoComplete="off"
        aria-label="Mensaje para el asistente IA"
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
