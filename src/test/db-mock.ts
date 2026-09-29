import { vi } from "vitest"

// Minimal fake of the tauri-plugin-sql Database used by the query modules
export function createMockDb() {
    return {
        execute: vi.fn<(...args: unknown[]) => Promise<{ rowsAffected: number, lastInsertId: number }>>(async () => ({ rowsAffected: 1, lastInsertId: 1 })),
        select: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => []),
        close: vi.fn(async () => true),
    }
}

export type MockDb = ReturnType<typeof createMockDb>
