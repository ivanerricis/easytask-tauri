import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hexToRgba(alpha: number, hex?: string) {
  const match = hex?.replace('#', '').match(/.{1,2}/g)
  if (!match) return hex
  const [r, g, b] = match.map(x => parseInt(x, 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function formatDate(dateStr: string) {
  if (!dateStr) return ""
  const [year, month, day] = dateStr.split("-")
  return `${day}-${month}-${year}`
}