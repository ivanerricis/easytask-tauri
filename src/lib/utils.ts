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
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "object" && err !== null && "message" in err) return String((err as { message: unknown }).message)
  return String(err)
}

/**
 * Formats a count with its Italian noun, e.g. plural(1, "task", "task") -> "1 task", plural(2, "gruppo", "gruppi") -> "2 gruppi".
 * @param count The quantity.
 * @param one Noun used when count is 1.
 * @param many Noun used otherwise.
 */
export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}
