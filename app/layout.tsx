import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TradingViewTickerTape } from "@/components/charts/TradingViewTickerTape";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { getSiteUrl } from "@/lib/site";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: {
    default: "MyInvestView | Análisis de Portafolio con IA y TradingView",
    template: "%s | MyInvestView",
  },
  description:
    "Optimiza tus inversiones con Inteligencia Artificial. Panel de portafolio avanzado con agentes de IA, análisis técnico de TradingView y seguimiento de rentabilidad en tiempo real.",
  keywords: [
    "IA para trading",
    "Análisis de portafolio",
    "Inversión inteligente",
    "Panel TradingView",
    "Agentes de IA",
    "Finanzas",
  ],
  authors: [{ name: "Duartec", url: siteUrl }],
  creator: "Duartec",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MyInvestView - Inteligencia Artificial aplicada al Trading",
    description: "Analiza tu cartera en segundos con agentes inteligentes.",
    url: siteUrl,
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
    description: "Maximiza tu rentabilidad con análisis de IA y TradingView.",
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
    <html lang="es" className={manrope.variable} suppressHydrationWarning>
      <body
        className="flex min-h-screen flex-col bg-background text-text antialiased overflow-x-hidden"
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-text focus:shadow-panel"
        >
          Saltar al contenido
        </a>
        <CurrencyProvider>
          <div className="w-full border-b border-border/60 bg-surface">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <TradingViewTickerTape />
            </div>
          </div>
          <Header />
          <main id="main-content" className="w-full flex-1" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </CurrencyProvider>
      </body>
    </html>
  );
}
