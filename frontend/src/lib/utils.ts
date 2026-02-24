import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function formatHours(h: number): string {
  return `${h.toLocaleString(undefined, { maximumFractionDigits: 1 })}h`;
}
