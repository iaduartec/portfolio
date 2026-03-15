/* eslint-disable */
import type { DetailedHTMLProps, HTMLAttributes } from "react";

type TvMarketSummaryAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  direction?: "horizontal" | "vertical";
  theme?: "dark" | "light";
};

type TvMiniChartAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  symbol?: string;
  theme?: "dark" | "light";
};

type TvTickerTapeAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  direction?: "horizontal" | "vertical";
  theme?: "dark" | "light";
  "show-hover"?: boolean;
};

declare global {
  // Support both legacy JSX namespace and React 19+ React.JSX namespace
  namespace JSX {
    interface IntrinsicElements {
      "tv-market-summary": TvMarketSummaryAttributes;
      "tv-mini-chart": TvMiniChartAttributes;
      "tv-ticker-tape": TvTickerTapeAttributes;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "tv-market-summary": TvMarketSummaryAttributes;
      "tv-mini-chart": TvMiniChartAttributes;
      "tv-ticker-tape": TvTickerTapeAttributes;
    }
  }
}

export {};
