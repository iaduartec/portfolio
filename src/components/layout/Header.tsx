'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";

const navItems: { href: Route; label: string }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/portfolio", label: "Portafolio" },
  { href: "/upload", label: "Cargar CSV" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/myinvestor.png?v=2"
            alt="MyInvestView"
            width={72}
            height={72}
            className="h-14 w-14 rounded-full bg-surface-muted/40 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight">MyInvestView</span>
        </Link>
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
      </div>
    </header>
  );
}
