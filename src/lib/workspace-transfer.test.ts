import { beforeEach, describe, expect, it, vi } from "vitest"
import { MAX_IMPORT_FILE_BYTES } from "@/types/transfer"

let size = 10
const readTextFile = vi.fn(async () => "{}")
const importDBWorkspace = vi.fn()
const importDBItems = vi.fn()
const buildDBItemExport = vi.fn()
const save = vi.fn()
const writeTextFile = vi.fn()

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn(async () => "/x/ws.easytask.json"), save: (...a: unknown[]) => save(...a) }))
vi.mock("@tauri-apps/plugin-fs", () => ({
    readTextFile: () => readTextFile(),
    writeTextFile: (...a: unknown[]) => writeTextFile(...a),
    stat: vi.fn(async () => ({ size })),
}))
vi.mock("@/db/queries/transfer", () => ({
    buildDBWorkspaceExport: vi.fn(),
    buildDBItemExport: (...a: unknown[]) => buildDBItemExport(...a),
    importDBItems: (...a: unknown[]) => importDBItems(...a),
    importDBWorkspace: (...a: unknown[]) => importDBWorkspace(...a),
    validateWorkspaceExport: (data: unknown) => data,
}))

import { exportItemToFile, importItemsFromFile, importWorkspaceFromFile } from "./workspace-transfer"

beforeEach(() => {
    size = 10
    readTextFile.mockClear()
    importDBWorkspace.mockReset().mockResolvedValue({ workspaceId: 1, skippedAudio: 0 })
    importDBItems.mockReset().mockResolvedValue({ skippedAudio: 0, items: [] })
    buildDBItemExport.mockReset().mockResolvedValue({ format: "easytask-workspace" })
    save.mockReset().mockResolvedValue("/x/out.easytask.json")
    writeTextFile.mockReset()
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

describe("importItemsFromFile", () => {
    it("imports the file into the given workspace and folder", async () => {
        await expect(importItemsFromFile(7, 3)).resolves.toEqual({ skippedAudio: 0, items: [] })
        expect(importDBItems).toHaveBeenCalledWith({}, 7, 3)
    })

    it("rejects a file above the size limit before reading it", async () => {
        size = MAX_IMPORT_FILE_BYTES + 1
        await expect(importItemsFromFile(7, null)).rejects.toMatchObject({ code: "TRANSFER_FILE_TOO_LARGE" })
        expect(importDBItems).not.toHaveBeenCalled()
    })
})

describe("exportItemToFile", () => {
    it("proposes the item name as file name and writes the export", async () => {
        await expect(exportItemToFile("note", { id: 4, name: "A/B" })).resolves.toBe(true)
        expect(save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: "A_B.easytask.json" }))
        expect(buildDBItemExport).toHaveBeenCalledWith("note", 4)
        expect(writeTextFile).toHaveBeenCalledTimes(1)
    })

    it("does nothing when the dialog is cancelled", async () => {
        save.mockResolvedValue(null)
        await expect(exportItemToFile("folder", { id: 1, name: "F" })).resolves.toBe(false)
        expect(buildDBItemExport).not.toHaveBeenCalled()
    })
})
