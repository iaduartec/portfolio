'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { ShieldCheck, Gamepad2 } from "lucide-react";

const navItems: { href: Route; label: string }[] = [
  { href: "/", label: "Panel" },
  { href: "/portfolio", label: "Portafolio" },
  { href: "/lab", label: "Lab Tecnico" },
  { href: "/upload", label: "Cargar CSV" },
];

export function Header() {
  const pathname = usePathname();
  const { currency, setCurrency } = useCurrency();

  return (
    <header className="sticky top-[42px] z-40 w-full border-b border-primary/20 bg-background/70 backdrop-blur-xl retro-scan">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/25 blur-lg opacity-0 transition-opacity group-hover:opacity-100" />
            <Image
              src="/myinvestor.png"
              alt="MyInvestView Logo"
              width={40}
              height={40}
              className="relative h-10 w-10 rounded-md border border-primary/40 bg-background/80 p-1 object-contain shadow-[0_0_18px_rgba(73,231,255,0.22)]"
            />
          </div>
          <span className="retro-title text-xs sm:text-sm text-white">
            MYINVEST
            <span className="text-primary">VIEW</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-1 text-xs tracking-[0.18em] text-muted">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md border px-4 py-2 transition-all font-medium",
                    isActive
                      ? "border-primary/55 bg-primary/15 text-primary shadow-[0_0_18px_rgba(73,231,255,0.2)]"
                      : "border-transparent text-muted hover:border-accent/40 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden h-4 w-[1px] bg-primary/40 md:block" />

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-success/35 bg-success/10 px-3 py-1.5">
              <ShieldCheck size={14} className="text-success" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-success">
                AI SECURED
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5">
              <Gamepad2 size={14} className="text-accent" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-accent">
                RETRO MODE
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-primary/25 bg-surface/90 p-1">
              {(["EUR", "USD"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  className={cn(
                    "rounded-sm px-2.5 py-1 text-[10px] tracking-[0.16em] transition-all",
                    currency === code
                      ? "bg-primary text-background shadow-[0_0_16px_rgba(73,231,255,0.38)]"
                      : "text-muted hover:text-white"
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
