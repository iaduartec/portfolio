import { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SiteButtonVariant = "primary" | "secondary";
type SiteButtonSize = "md" | "lg";

interface SiteButtonBaseProps {
  children: ReactNode;
  className?: string;
  variant?: SiteButtonVariant;
  size?: SiteButtonSize;
  ariaLabel?: string;
}

interface SiteButtonAsButton extends SiteButtonBaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  href?: undefined;
}

interface SiteButtonAsLink
  extends SiteButtonBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> {
  href: string;
}

type SiteButtonProps = SiteButtonAsButton | SiteButtonAsLink;

const variants: Record<SiteButtonVariant, string> = {
  primary:
    "border-primary/55 bg-primary text-background hover:border-primary hover:bg-[#5bd2ff] focus-visible:ring-primary/55",
  secondary:
    "border-border bg-surface/70 text-text hover:border-accent/60 hover:bg-surface-muted/80 focus-visible:ring-accent/40",
};

const sizes: Record<SiteButtonSize, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm sm:h-12 sm:px-6",
};

const sharedClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2";

export function SiteButton(props: SiteButtonProps) {
  const {
    children,
    className,
    variant = "primary",
    size = "md",
  } = props;

  const composedClassName = cn(sharedClassName, variants[variant], sizes[size], className);

  if ("href" in props && props.href) {
    const { href, ariaLabel, ...anchorProps } = props;
    return (
      <a href={href} className={composedClassName} aria-label={ariaLabel} {...anchorProps}>
        {children}
      </a>
    );
  }

  const { type = "button", ariaLabel, ...buttonProps } = props as SiteButtonAsButton;

  return (
    <button type={type} {...buttonProps} aria-label={ariaLabel} className={composedClassName}>
      {children}
    </button>
  );
}
