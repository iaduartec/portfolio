"use client";

export function GridBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

            {/* Animated Light Beam */}
            <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-primary/0 via-primary/20 to-primary/0 animate-float" style={{ animationDuration: '8s' }} />
            <div className="absolute top-0 right-1/3 w-[1px] h-full bg-gradient-to-b from-primary/0 via-primary/10 to-primary/0 animate-float" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        </div>
    );
}
