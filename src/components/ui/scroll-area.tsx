import * as React from "react"
import { cn } from "@/lib/utils"

// Simplified ScrollArea without Radix UI dependency for now to save time/complexity if not needed
// or we can install @radix-ui/react-scroll-area
export function ScrollArea({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div className={cn("overflow-auto", className)}>
            {children}
        </div>
    )
}
