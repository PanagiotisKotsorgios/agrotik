import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconTrailing?: IconName;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-dark text-white hover:bg-brand-mid border border-brand-dark hover:border-brand-mid",
  secondary:
    "bg-brand-surface text-brand-ink border border-brand-border hover:border-brand-mid hover:text-brand-dark",
  outline:
    "bg-transparent text-brand-dark border border-brand-dark/40 hover:border-brand-dark hover:bg-brand-dark/5",
  ghost:
    "bg-transparent text-brand-ink hover:bg-brand-border/40",
  danger:
    "bg-[#7A1A1A] text-white border border-[#7A1A1A] hover:bg-[#902828]",
};

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-2 text-[14px] rounded-md gap-2",
  md: "px-5 py-2.5 text-[15px] rounded-md gap-2",
  lg: "px-6 py-3.5 text-[17px] rounded-md gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", icon, iconTrailing, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-semibold tracking-tight",
        "transition-colors focus:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} className="text-[1em] opacity-95" />}
      {children}
      {iconTrailing && <Icon name={iconTrailing} className="text-[1em] opacity-95" />}
    </button>
  ),
);
Button.displayName = "Button";
