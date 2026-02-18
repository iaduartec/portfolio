'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { ShieldCheck, Sparkles } from "lucide-react";

const navItems: { href: Route; label: string }[] = [
  { href: "/", label: "Panel" },
  { href: "/portfolio", label: "Cartera" },
  { href: "/lab", label: "Lab Tecnico" },
  { href: "/upload", label: "Cargar CSV" },
];

export function Header() {
  const pathname = usePathname();
  const { currency, setCurrency } = useCurrency();

  return (
    <header className="sticky top-[42px] z-40 w-full border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
              <Image
                src="/myinvestor.png"
                alt="MyInvestView Logo"
                width={40}
                height={40}
                className="relative h-10 w-10 rounded-xl border border-primary/30 bg-surface-muted/70 p-1 object-contain"
              />
            </div>
            <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
              MyInvest<span className="text-primary">View</span>
            </span>
          </Link>

          <div className="flex items-center gap-4 md:gap-6">
            <nav
              aria-label="Navegación principal"
              className="hidden items-center gap-1 text-xs font-medium text-muted md:flex"
            >
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "rounded-lg border px-3 py-2 transition-all",
                      isActive
                        ? "border-primary/45 bg-primary/10 text-primary"
                        : "border-transparent text-muted hover:border-border hover:bg-surface/60 hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden h-5 w-px bg-border md:block" />

            <div className="hidden items-center gap-2 rounded-full border border-success/35 bg-success/10 px-3 py-1.5 lg:flex">
              <ShieldCheck size={14} className="text-success" />
              <span className="text-[11px] font-medium text-success">AI Protegida</span>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 lg:flex">
              <Sparkles size={14} className="text-accent" />
              <span className="text-[11px] font-medium text-accent">Insights en vivo</span>
            </div>

            <div
              role="group"
              aria-label="Moneda base"
              className="flex items-center gap-1 rounded-lg border border-border bg-surface/85 p-1"
            >
              {(["EUR", "USD"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  aria-pressed={currency === code}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                    currency === code
                      ? "bg-primary text-background shadow-[0_0_14px_rgba(62,199,255,0.34)]"
                      : "text-muted hover:text-white"
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <nav
          aria-label="Navegación móvil"
          className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium text-muted md:hidden"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 transition-all",
                  isActive
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border/70 bg-surface/60 text-muted hover:border-border hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
