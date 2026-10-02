import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ArcBandsBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

const ArcBandsBackground = forwardRef<HTMLDivElement, ArcBandsBackgroundProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="arc-bands-background"
        className={cn("relative isolate overflow-hidden bg-app-bg", className)}
        {...props}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[28%] left-1/2 -z-10 h-[92%] w-[150%] -translate-x-1/2 rounded-[100%] [background:radial-gradient(ellipse_120%_88%_at_50%_100%,rgba(16,29,189,0.6)_0%,rgba(52,66,214,0.46)_20%,rgba(104,116,232,0.34)_42%,rgba(168,175,244,0.22)_62%,transparent_82%)] dark:[background:radial-gradient(ellipse_120%_88%_at_50%_100%,rgba(6,12,100,0.75)_0%,rgba(14,26,140,0.55)_20%,rgba(30,44,170,0.38)_42%,rgba(52,66,190,0.22)_62%,transparent_82%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[22%] left-1/2 -z-10 h-[78%] w-[128%] -translate-x-1/2 rounded-[100%] blur-2xl [background:radial-gradient(ellipse_110%_80%_at_50%_100%,rgba(16,29,189,0.32)_0%,rgba(60,74,220,0.24)_24%,rgba(120,132,238,0.18)_48%,rgba(190,195,248,0.12)_68%,transparent_86%)] dark:[background:radial-gradient(ellipse_110%_80%_at_50%_100%,rgba(6,12,100,0.4)_0%,rgba(16,28,145,0.3)_24%,rgba(34,48,172,0.2)_48%,rgba(54,68,190,0.12)_68%,transparent_86%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[18%] left-1/2 -z-10 h-[64%] w-[108%] -translate-x-1/2 rounded-[100%] blur-3xl [background:radial-gradient(ellipse_100%_72%_at_50%_100%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.14)_38%,transparent_72%)] dark:opacity-15"
        />
        {children}
      </div>
    );
  },
);

ArcBandsBackground.displayName = "ArcBandsBackground";
export { ArcBandsBackground };
