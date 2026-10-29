import { vi } from "vitest"

/** The spies behind the `sonner` mock: assert on them (`toastMock.error`) and clear them with `vi.clearAllMocks()`. */
export const toastMock = Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
})

/**
 * Factory for `vi.mock("sonner", ...)`: a superset of the shapes hand-written in the tests (`toast` is callable and has
 * the usual methods; `Toaster` renders nothing).
 *
 * @example
 * vi.mock("sonner", async () => (await import("@/test/mocks")).sonnerMock())
 * // in a test:
 * const { toastMock } = await import("@/test/mocks")
 * expect(toastMock.error).toHaveBeenCalled()
 */
export const sonnerMock = () => ({ toast: toastMock, Toaster: () => null })
