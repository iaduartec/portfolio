"use client";

export function GridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(62, 199, 255, 0.18) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(62, 199, 255, 0.18) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: "56px 56px",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

      <div className="absolute left-[-12%] top-[-6%] h-80 w-80 rounded-full bg-primary/20 blur-[140px] animate-pulse-soft" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-[160px] animate-pulse-soft [animation-delay:1s]" />

      <div
        className="absolute left-1/4 top-0 h-full w-[1px] bg-gradient-to-b from-primary/0 via-primary/30 to-primary/0 animate-float"
        style={{ animationDuration: "9s" }}
      />
      <div
        className="absolute right-1/3 top-0 h-full w-[1px] bg-gradient-to-b from-accent/0 via-accent/25 to-accent/0 animate-float"
        style={{ animationDuration: "12s", animationDelay: "1.4s" }}
      />
    </div>
  );
}
