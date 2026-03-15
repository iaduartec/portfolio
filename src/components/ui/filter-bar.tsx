import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col gap-4 rounded-[1.5rem] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5",
        className
      )}
    >
      {children}
    </div>
  );
}
