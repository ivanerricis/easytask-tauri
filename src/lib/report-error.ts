import { toast } from "sonner"

const DEDUPE_WINDOW_MS = 2000
const recentToasts = new Map<string, number>()

/** Forgets the recently shown toasts (tests only). */
export const resetReportErrorDedupe = () => recentToasts.clear()

/**
 * Logs an error to the console and, when a user message is given, shows an error toast.
 * Identical toasts fired within a short window are shown only once.
 */
export function reportError(error: unknown, userMessage?: string): void {
    console.error(userMessage ? `${userMessage} ` : "", error)
    if (!userMessage) return

    const now = Date.now()
    for (const [message, at] of recentToasts) {
        if (now - at >= DEDUPE_WINDOW_MS) recentToasts.delete(message)
    }
    if (recentToasts.has(userMessage)) return
    recentToasts.set(userMessage, now)
    toast.error(userMessage)
}
