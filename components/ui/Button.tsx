import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark disabled:bg-primary/60 shadow-app-md",
  outline: "border border-border bg-card text-text-primary hover:bg-primary-bg",
  ghost: "text-text-secondary hover:bg-primary-bg",
  danger: "bg-error text-white hover:bg-error/90 disabled:bg-error/60 shadow-app-md",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-app px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
