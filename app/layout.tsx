import type { Metadata } from "next";
import { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { TradingViewTickerTape } from "@/components/charts/TradingViewTickerTape";

export const metadata: Metadata = {
  title: "MyInvestView | Análisis de Portafolio con IA y TradingView",
  description: "Optimiza tus inversiones con Inteligencia Artificial. Panel de portafolio avanzado con agentes de IA, analisis tecnico de TradingView y seguimiento de rentabilidad en tiempo real.",
  keywords: ["IA para trading", "Analisis de portafolio", "Inversion inteligente", "Panel TradingView", "Agentes de IA", "Finanzas"],
  authors: [{ name: "Duartec" }],
  openGraph: {
    title: "MyInvestView - Inteligencia Artificial aplicada al Trading",
    description: "Analiza tu cartera en segundos con agentes inteligentes.",
    url: "https://portfolio-duartec.vercel.app",
    siteName: "MyInvestView",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyInvestView | Análisis de Portafolio con IA",
    description: "Maximiza tu rentabilidad con analisis de IA y TradingView.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-text antialiased">
        <div className="border-b border-border/60 bg-surface">
          <TradingViewTickerTape />
        </div>
        <Header />
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
