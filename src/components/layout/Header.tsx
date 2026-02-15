'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { ShieldCheck, Cpu } from "lucide-react";

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
    <header className="sticky top-[42px] z-40 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Image
              src="/myinvestor.png"
              alt="MyInvestView Logo"
              width={40}
              height={40}
              className="relative h-10 w-10 rounded-xl bg-white/5 object-contain p-1 border border-white/10"
            />
          </div>
          <span className="text-xl font-black tracking-tighter text-white">MYINVEST<span className="text-primary">VIEW</span></span>
        </Link>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-4 py-2 transition-all hover:text-white",
                    isActive ? "bg-white/5 text-primary border border-white/5 shadow-[0_0_15px_rgba(41,98,255,0.1)]" : "text-muted-foreground/60"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="h-4 w-[1px] bg-white/10 hidden md:block" />

          <div className="flex items-center gap-4">
            {/* AI Status */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <ShieldCheck size={14} className="text-green-400" />
              <span className="text-[10px] font-black uppercase text-green-400 tracking-tighter">AI SECURED</span>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5">
              {(["EUR", "USD"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[10px] font-black transition-all",
                    currency === code
                      ? "bg-primary text-white shadow-lg"
                      : "text-muted-foreground/40 hover:text-muted-foreground"
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
