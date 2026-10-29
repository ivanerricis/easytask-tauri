import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { currentLanguage } from "@/i18n"
import { parseHex } from "@/lib/colors"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * "rgba(r, g, b, alpha)" for a "#rgb" or "#rrggbb" color.
 * @returns `hex` itself when empty or missing; undefined when it is not a hex color (before, a garbage "rgba(NaN, ...)" the browser ignored).
 */
export function hexToRgba(alpha: number, hex?: string) {
  if (!hex) return hex
  const rgb = parseHex(hex)
  if (!rgb) return undefined
  const [r, g, b] = rgb
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Formats a "YYYY-MM-DD" date following the current language ("DD-MM-YYYY" in Italian, "MM/DD/YYYY" in English). */
export function formatDate(dateStr: string) {
  if (!dateStr) return ""
  const [year, month, day] = dateStr.split("-")
  if (currentLanguage() === "it") return `${day}-${month}-${year}`
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "object" && err !== null && "message" in err) return String((err as { message: unknown }).message)
  return String(err)
}
