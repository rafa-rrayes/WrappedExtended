import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ className, glass, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] p-8 border transition-all",
        glass
          ? "bg-bg-card/60 backdrop-blur-xl border-white/[0.08]"
          : "bg-bg-card border-border hover:bg-bg-card-hover hover:border-white/10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
