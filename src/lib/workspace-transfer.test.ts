import { beforeEach, describe, expect, it, vi } from "vitest"
import { MAX_IMPORT_FILE_BYTES } from "@/types/transfer"

let size = 10
const readTextFile = vi.fn(async () => "{}")
const importDBWorkspace = vi.fn()

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn(async () => "/x/ws.easytask.json"), save: vi.fn() }))
vi.mock("@tauri-apps/plugin-fs", () => ({
    readTextFile: () => readTextFile(),
    writeTextFile: vi.fn(),
    stat: vi.fn(async () => ({ size })),
}))
vi.mock("@/db/queries/transfer", () => ({
    buildDBWorkspaceExport: vi.fn(),
    importDBWorkspace: (...a: unknown[]) => importDBWorkspace(...a),
    validateWorkspaceExport: (data: unknown) => data,
}))

import { importWorkspaceFromFile } from "./workspace-transfer"

beforeEach(() => {
    size = 10
    readTextFile.mockClear()
    importDBWorkspace.mockReset().mockResolvedValue({ workspaceId: 1, skippedAudio: 0 })
})

describe("importWorkspaceFromFile", () => {
    it("rejects a file above the size limit before reading it", async () => {
        size = MAX_IMPORT_FILE_BYTES + 1
        await expect(importWorkspaceFromFile()).rejects.toMatchObject({ code: "TRANSFER_FILE_TOO_LARGE" })
        expect(readTextFile).not.toHaveBeenCalled()
    })

    it("imports a file within the limit", async () => {
        await expect(importWorkspaceFromFile()).resolves.toEqual({ workspaceId: 1, skippedAudio: 0 })
        expect(readTextFile).toHaveBeenCalledTimes(1)
    })
})
