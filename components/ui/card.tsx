import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-brand-surface border border-brand-border rounded-card shadow-card",
        "p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("display text-xl text-brand-dark", className)} {...props} />;
}

export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("eyebrow", className)} {...props} />;
}

type BadgeTone = "default" | "brand" | "olive" | "warn" | "danger" | "muted" | "ok";

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    default: "bg-brand-bg text-brand-ink border-brand-border",
    brand: "bg-brand-dark/8 text-brand-dark border-brand-dark/15",
    olive: "bg-brand-olive/12 text-brand-olive border-brand-olive/25",
    warn: "bg-amber-50 text-amber-900 border-amber-200",
    danger: "bg-red-50 text-red-900 border-red-200",
    muted: "bg-brand-border/40 text-brand-muted border-transparent",
    ok: "bg-emerald-50 text-emerald-900 border-emerald-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[12px] font-semibold rounded-full border",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
