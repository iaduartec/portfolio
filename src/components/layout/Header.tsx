'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { ShieldCheck, Sparkles } from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const navItems: { href: Route; label: string }[] = [
  { href: "/", label: "Inicio" },
  { href: "/portfolio", label: "Cartera" },
  { href: "/lab", label: "Laboratorio" },
  { href: "/upload", label: "Importar" },
];

export function Header() {
  const pathname = usePathname();
  const { currency, setCurrency } = useCurrency();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/84 backdrop-blur-xl sm:top-[33px]">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/12 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
              <Image
                src={`${basePath}/myinvestor.png`}
                alt="Logotipo de MyInvestView"
                width={40}
                height={40}
                className="relative h-11 w-11 rounded-2xl border border-primary/18 bg-surface/90 p-1.5 object-contain shadow-soft"
              />
            </div>
            <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
              MyInvest<span className="text-primary">View</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 md:gap-5">
            <nav
              aria-label="Navegación principal"
              className="hidden items-center gap-1 rounded-full border border-border/70 bg-surface/72 p-1 text-xs font-medium text-muted md:flex"
            >
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "rounded-full border px-3.5 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65",
                      isActive
                        ? "border-primary/22 bg-primary/14 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                        : "border-transparent text-text-tertiary hover:border-border/80 hover:bg-surface-muted/55 hover:text-text"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden h-5 w-px bg-border md:block" />

            <div className="hidden items-center gap-2 rounded-full border border-success/20 bg-success/8 px-3 py-1.5 lg:flex">
              <ShieldCheck size={14} className="text-success" />
              <span className="text-[11px] font-medium text-success">IA protegida</span>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 py-1.5 lg:flex">
              <Sparkles size={14} className="text-accent" />
              <span className="text-[11px] font-medium text-accent">Señales en vivo</span>
            </div>

            <div
              role="group"
              aria-label="Moneda base"
              className="flex items-center gap-1 rounded-full border border-border/70 bg-surface/80 p-1"
            >
              {(["EUR", "USD"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  aria-pressed={currency === code}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65",
                      currency === code
                        ? "bg-primary text-background"
                        : "text-text-tertiary hover:text-text"
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
          className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium text-muted md:hidden"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65",
                  isActive
                    ? "border-primary/22 bg-primary/14 text-primary"
                    : "border-border/70 bg-surface/72 text-text-tertiary hover:border-border hover:text-text"
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
