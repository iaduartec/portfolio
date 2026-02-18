import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ShellProps {
  className?: string;
  children: ReactNode;
}

export function Shell({ className, children }: ShellProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 md:py-12",
        className
      )}
    >
      {children}
    </div>
  );
}
