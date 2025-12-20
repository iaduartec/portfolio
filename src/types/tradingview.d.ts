import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare namespace JSX {
  interface IntrinsicElements {
    "tv-market-summary": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
      direction?: "horizontal" | "vertical";
    };
  }
}
