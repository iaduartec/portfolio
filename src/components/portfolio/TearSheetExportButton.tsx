"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import html2canvas from "html2canvas";

interface TearSheetExportButtonProps {
  targetId: string;
}

export function TearSheetExportButton({ targetId }: TearSheetExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById(targetId);
      if (!element) {
        throw new Error(`Elemento con ID "${targetId}" no encontrado.`);
      }

      // Add a slight delay to ensure UI is completely painted (like charts)
      await new Promise(res => setTimeout(res, 300));

      const canvas = await html2canvas(element, {
        scale: 2,           // Retina quality
        useCORS: true,      // Allow fetching external images like icons
        backgroundColor: "#070b14", // Fallback to our deep space theme
        ignoreElements: (el) => {
          // You could ignore tooltips or interactive buttons here
          return el.classList ? el.classList.contains("no-export") : false;
        }
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];

      link.download = `MyInvestView_TearSheet_${dateStr}.png`;
      link.href = dataUrl;
      link.click();

    } catch (err) {
      console.error("Fallo al exportar Tear Sheet", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className={`inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${isExporting ? "opacity-50 cursor-not-allowed" : ""
        }`}
      title="Generar Tear Sheet (PNG)"
    >
      <Download size={14} className={isExporting ? "animate-bounce" : ""} />
      {isExporting ? "Generando..." : "Snapshot"}
    </button>
  );
}
