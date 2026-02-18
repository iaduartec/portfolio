"use client";

export function GridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(73, 231, 255, 0.16) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(73, 231, 255, 0.16) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: "50px 50px",
          transform: "perspective(900px) rotateX(72deg) scale(1.4)",
          transformOrigin: "center 100%",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/35 to-background" />

      <div className="absolute left-[-20%] top-[-10%] h-72 w-72 rounded-full bg-accent/25 blur-[130px] animate-pulse-soft" />
      <div className="absolute bottom-[-18%] right-[-12%] h-80 w-80 rounded-full bg-primary/20 blur-[150px] animate-pulse-soft [animation-delay:0.8s]" />

      <div
        className="absolute top-0 left-1/4 h-full w-[1px] bg-gradient-to-b from-primary/0 via-primary/45 to-primary/0 animate-float"
        style={{ animationDuration: "7s" }}
      />
      <div
        className="absolute top-0 right-1/3 h-full w-[1px] bg-gradient-to-b from-accent/0 via-accent/35 to-accent/0 animate-float"
        style={{ animationDuration: "11s", animationDelay: "1.4s" }}
      />
    </div>
  );
}
