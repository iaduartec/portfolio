/* eslint-disable */
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
    "tv-market-summary": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
      direction?: "horizontal" | "vertical";
      theme?: "dark" | "light";
    };
    "tv-mini-chart": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
      symbol?: string;
      theme?: "dark" | "light";
    };
    }
  }
}

export {};
