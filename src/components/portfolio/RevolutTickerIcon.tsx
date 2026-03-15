'use client';

import { cn } from "@/lib/utils";

interface RevolutTickerIconProps {
  ticker: string;
  className?: string;
}

export function RevolutTickerIcon({ ticker, className }: RevolutTickerIconProps) {
  const colors: Record<string, string> = {
    "REP.MC": "bg-[#FF4D00]",
    "BTC-USD": "bg-[#F7931A]",
    "NVDA": "bg-[#76B900]",
    "AAPL": "bg-[#A2AAAD]",
    "MSFT": "bg-[#00A4EF]",
    "AMZN": "bg-[#FF9900]",
    "GOOGL": "bg-[#4285F4]",
    "SPY": "bg-[#1d4ed8]",
  };
  
  const bgColor = colors[ticker] || "bg-primary/20";
  const initial = ticker.charAt(0);
  
  return (
    <div className={cn("flex items-center justify-center rounded-full text-[10px] font-bold text-white", bgColor, className)}>
      {initial}
    </div>
  );
}
