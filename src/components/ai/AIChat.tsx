"use client";

import React, { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { StockCard } from "./stock-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIChat() {
    const [input, setInput] = useState("");
    const transport = useMemo(() => new DefaultChatTransport({ api: "/api/ai" }), []);
    const { messages, sendMessage, status, error } = useChat({
        transport,
        onError: (error: Error) => {
            console.error("AI Chat Error:", error);
        }
    });

    const isLoading = status === "submitted" || status === "streaming";

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput(""); // Clear input immediately

        try {
            await sendMessage({ text: userMessage });
        } catch (err) {
            console.error("Failed to send message:", err);
            setInput(userMessage); // Restore input on error
        }
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-md border border-border rounded-xl bg-surface shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-border bg-surface-muted/50">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Bot size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">API de OpenAI</h3>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                    {messages.length === 0 && !error && (
                        <div className="text-center text-muted-foreground text-sm py-10">
                            <p>Preguntame por tu cartera, valores concretos o escenarios de mercado.</p>
                            <p className="mt-2 text-xs opacity-70">Ejemplo: &quot;Como va AAPL?&quot;</p>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <AlertCircle size={16} />
                            <span>No se pudo conectar con el asistente de IA. Revisa tu conexion o la clave API.</span>
                        </div>
                    )}
                    {messages.map((m: any) => {
                        const textParts = Array.isArray(m.parts)
                            ? m.parts.filter((part: any) => part.type === "text")
                            : [];
                        const messageText = textParts.map((part: any) => part.text).join("\n");
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
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                                )}
                            >
                                {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                            </div>

                            <div className="flex flex-col gap-2 max-w-[80%]">
                                {messageText && (
                                    <div
                                        className={cn(
                                            "p-3 rounded-2xl",
                                            m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border rounded-tl-none"
                                        )}
                                    >
                                        {messageText}
                                    </div>
                                )}

                                {toolParts.map((toolPart: any) => {
                                    if (toolPart.type !== "tool-showStock") return null;
                                    const toolCallId = toolPart.toolCallId ?? toolPart.id ?? "tool-call";

                                    if (toolPart.state === "output-available" && toolPart.output) {
                                        return (
                                            <div key={toolCallId} className="mt-2">
                                                <StockCard {...toolPart.output} />
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={toolCallId} className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse p-2 border rounded-lg">
                                            <Bot size={12} />
                                            Cargando datos del valor...
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </ScrollArea>

            <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-surface-muted/30 flex gap-2">
                <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Escribe un mensaje..."
                    className="flex-1"
                    disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    <Send size={18} />
                </Button>
            </form>
        </div>
    );
}
