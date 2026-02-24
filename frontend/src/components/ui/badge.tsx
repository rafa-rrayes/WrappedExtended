import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "green" | "gold" | "muted";
}

export function Badge({ className, variant = "green", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full border",
        variant === "green" && "text-green border-green/30 bg-green-dim",
        variant === "gold" && "text-gold border-gold/30 bg-gold-dim",
        variant === "muted" && "text-text-muted border-border",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
