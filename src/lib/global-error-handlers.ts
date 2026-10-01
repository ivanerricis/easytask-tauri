import i18n from "@/i18n"
import { reportError } from "@/lib/report-error"

// Benign browser notifications that are not real failures
const IGNORED_MESSAGES = [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
]

/**
 * Reports uncaught errors and unhandled promise rejections (console + deduplicated toast).
 * Returns a function that removes the listeners.
 */
export function installGlobalErrorHandlers(target: Window = window): () => void {
    const onError = (event: ErrorEvent) => {
        if (IGNORED_MESSAGES.some(message => event.message?.includes(message))) return
        reportError(event.error ?? event.message, i18n.t("crash.unhandledError"))
    }
    const onRejection = (event: PromiseRejectionEvent) => {
        reportError(event.reason, i18n.t("crash.unhandledRejection"))
    }
    target.addEventListener("error", onError)
    target.addEventListener("unhandledrejection", onRejection)
    return () => {
        target.removeEventListener("error", onError)
        target.removeEventListener("unhandledrejection", onRejection)
    }
}
