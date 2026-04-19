import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const SEVERITY_COLORS = [
  '#22c55e', // Low - Green
  '#eab308', // Moderate - Yellow
  '#3b82f6', // High - Blue
  '#f43f5e', // Critical - Red
]