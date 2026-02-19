import { Shell } from "@/components/layout/Shell";
import { PortfolioClient } from "@/components/portfolio/PortfolioClient";

export default function PortfolioPage() {
  return (
    <Shell className="max-w-[1320px]">
      <PortfolioClient />
    </Shell>
  );
}
