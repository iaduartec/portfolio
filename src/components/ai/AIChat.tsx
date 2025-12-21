"use client";

import { useChat } from "@ai-sdk/react";
import { StockCard } from "./stock-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIChat() {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: "/api/ai",
    } as any) as any;

    return (
        <div className="flex flex-col h-[600px] w-full max-w-md border border-border rounded-xl bg-surface shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-border bg-surface-muted/50">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Bot size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">Portfolio Assistant</h3>
                    <p className="text-xs text-muted-foreground">Powered by Gemini</p>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-10">
                            <p>Ask me about your portfolio, specific stocks, or market scenarios.</p>
                            <p className="mt-2 text-xs opacity-70">Example: "How is AAPL doing?"</p>
                        </div>
                    )}
                    {messages.map((m: any) => (
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
                                {m.content && (
                                    <div
                                        className={cn(
                                            "p-3 rounded-2xl",
                                            m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border rounded-tl-none"
                                        )}
                                    >
                                        {m.content}
                                    </div>
                                )}

                                {/* Render Tool Invocations (Generative UI) */}
                                {m.toolInvocations?.map((toolInvocation: any) => {
                                    const toolCallId = toolInvocation.toolCallId;

                                    if (toolInvocation.toolName === 'showStock') {
                                        // Check if we have a result
                                        if ('result' in toolInvocation) {
                                            return (
                                                <div key={toolCallId} className="mt-2">
                                                    <StockCard {...toolInvocation.result} />
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div key={toolCallId} className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse p-2 border rounded-lg">
                                                    <Bot size={12} />
                                                    Loading stock data...
                                                </div>
                                            )
                                        }
                                    }

                                    return null;
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-surface-muted/30 flex gap-2">
                <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={isLoading || !input?.trim()}>
                    <Send size={18} />
                </Button>
            </form>
        </div>
    );
}
