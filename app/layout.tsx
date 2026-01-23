import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TradingViewTickerTape } from "@/components/charts/TradingViewTickerTape";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: {
    default: "MyInvestView | Análisis de Portafolio con IA y TradingView",
    template: "%s | MyInvestView",
  },
  description: "Optimiza tus inversiones con Inteligencia Artificial. Panel de portafolio avanzado con agentes de IA, analisis tecnico de TradingView y seguimiento de rentabilidad en tiempo real.",
  keywords: ["IA para trading", "Analisis de portafolio", "Inversion inteligente", "Panel TradingView", "Agentes de IA", "Finanzas"],
  authors: [{ name: "Duartec", url: "https://portfolio-duartec.vercel.app" }],
  creator: "Duartec",
  metadataBase: new URL("https://portfolio-duartec.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MyInvestView - Inteligencia Artificial aplicada al Trading",
    description: "Analiza tu cartera en segundos con agentes inteligentes.",
    url: "https://portfolio-duartec.vercel.app",
    siteName: "MyInvestView",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MyInvestView Dashboard",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyInvestView | Análisis de Portafolio con IA",
    description: "Maximiza tu rentabilidad con analisis de IA y TradingView.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#131722",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={manrope.variable}>
      <body suppressHydrationWarning className="flex min-h-screen flex-col bg-background text-text antialiased">
        <CurrencyProvider>
          <div className="border-b border-border/60 bg-surface">
            <TradingViewTickerTape />
          </div>
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </CurrencyProvider>
      </body>
    </html>
  );
}
