'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useEffect, useState } from "react";

const navItems: { href: Route; label: string }[] = [
  { href: "/", label: "Panel" },
  { href: "/portfolio", label: "Portafolio" },
  { href: "/lab", label: "Lab Tecnico" },
  { href: "/ai-agents", label: "Agentes de IA" },
  { href: "/upload", label: "Cargar CSV" },
];

export function Header() {
  const pathname = usePathname();
  const { currency, setCurrency } = useCurrency();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/myinvestor.png"
            alt="MyInvestView Logo"
            width={72}
            height={72}
            className="h-14 w-14 rounded-full bg-surface-muted/40 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight">MyInvestView</span>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-3 text-sm">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-muted transition hover:bg-surface-muted/60 hover:text-text",
                    isActive && "bg-surface-muted text-text shadow-panel"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface-muted/40 px-2 py-1 text-xs text-muted">
            <span className="uppercase tracking-[0.08em]">Moneda</span>
            <div className="flex items-center gap-1">
              {(["EUR", "USD"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  className={cn(
                    "rounded-md px-2 py-1 font-semibold transition",
                    mounted && currency === code
                      ? "bg-surface text-text shadow-panel"
                      : "text-muted hover:text-text"
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
