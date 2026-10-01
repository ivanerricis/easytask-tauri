import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { currentLanguage } from "@/i18n"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hexToRgba(alpha: number, hex?: string) {
  const match = hex?.replace('#', '').match(/.{1,2}/g)
  if (!match) return hex
  const [r, g, b] = match.map(x => parseInt(x, 16))
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
