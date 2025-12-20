import type { Metadata } from "next";
import { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { TradingViewTickerTape } from "@/components/charts/TradingViewTickerTape";

export const metadata: Metadata = {
  title: "MyInvestView",
  description: "Dashboard de portafolio inspirado en TradingView",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-background text-text antialiased">
        <div className="min-h-screen bg-background text-text">
          <div className="border-b border-border/60 bg-surface">
            <TradingViewTickerTape />
          </div>
          <Header />
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
