import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import { store } from "@/lib/store/initStore"

// The settings store needs Tauri: every test gets an in-memory one (a test can still vi.mock it with its own)
vi.mock("@/lib/store/initStore", () => {
    const data = new Map<string, unknown>()
    return {
        store: {
            get: async (key: string) => data.get(key),
            set: async (key: string, value: unknown) => { data.set(key, value) },
            delete: async (key: string) => { data.delete(key) },
            save: async () => { },
            clear: () => data.clear(),
        },
    }
})

afterEach(async () => {
    cleanup()
    // Imported lazily so a test's own vi.mock("sonner") applies to the module
    ;(await import("@/lib/report-error")).resetReportErrorDedupe()
    ;(store as unknown as { clear?: () => void }).clear?.()
})
