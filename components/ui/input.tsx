import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-3.5 py-2.5 rounded-lg border border-brand-border bg-brand-surface text-brand-ink text-[16px] placeholder:text-brand-muted/70",
        "focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid",
        "disabled:bg-brand-bg disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-3.5 py-2.5 rounded-lg border border-brand-border bg-brand-surface text-brand-ink text-[16px] placeholder:text-brand-muted/70",
        "focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full px-3.5 py-2.5 rounded-lg border border-brand-border bg-brand-surface text-brand-ink text-[16px]",
        "focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-[14px] font-semibold text-brand-ink mb-1.5", className)}>
      {children}
    </label>
  );
}
