import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
}

export function Button({ className, variant = "primary", children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "font-semibold px-8 py-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary"
          ? "bg-green hover:bg-green/90 text-bg-deep"
          : "border border-border hover:border-text-muted text-text-secondary hover:text-text-primary",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
