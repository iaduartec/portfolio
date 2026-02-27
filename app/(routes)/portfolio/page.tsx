import { Shell } from "@/components/layout/Shell";
import { PortfolioClient } from "@/components/portfolio/PortfolioClient";
import { Suspense } from "react";

export default function PortfolioPage() {
  return (
    <Shell className="max-w-[1320px]">
      <Suspense fallback={<div className="text-sm text-muted">Cargando portfolio…</div>}>
        <PortfolioClient />
      </Suspense>
    </Shell>
  );
}
