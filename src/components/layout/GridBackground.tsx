"use client";

export function GridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(82, 182, 247, 0.14) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(82, 182, 247, 0.14) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: "72px 72px",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />

      <div className="absolute left-[-12%] top-[-6%] h-80 w-80 rounded-full bg-primary/12 blur-[160px] animate-pulse-soft" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-[180px] animate-pulse-soft [animation-delay:1s]" />

      <div
        className="absolute left-1/4 top-0 h-full w-[1px] bg-gradient-to-b from-primary/0 via-primary/14 to-primary/0 animate-float"
        style={{ animationDuration: "9s" }}
      />
      <div
        className="absolute right-1/3 top-0 h-full w-[1px] bg-gradient-to-b from-accent/0 via-accent/14 to-accent/0 animate-float"
        style={{ animationDuration: "12s", animationDelay: "1.4s" }}
      />
    </div>
  );
}
