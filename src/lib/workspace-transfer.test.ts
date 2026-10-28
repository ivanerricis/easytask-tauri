import { beforeEach, describe, expect, it, vi } from "vitest"
import { MAX_IMPORT_FILE_BYTES } from "@/types/transfer"

let size = 10
let fileContent = "{}"
const readTextFile = vi.fn(async () => fileContent)
const suggestDBItemNames = vi.fn()
const importDBWorkspace = vi.fn()
const importDBItems = vi.fn()
const buildDBItemExport = vi.fn()
const buildDBWorkspaceExport = vi.fn()
const buildDBItemsExport = vi.fn()
const open = vi.fn()
const save = vi.fn()
const writeTextFile = vi.fn()

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: (...a: unknown[]) => open(...a), save: (...a: unknown[]) => save(...a) }))
vi.mock("@tauri-apps/plugin-fs", () => ({
    readTextFile: () => readTextFile(),
    writeTextFile: (...a: unknown[]) => writeTextFile(...a),
    stat: vi.fn(async () => ({ size })),
}))
vi.mock("@/db/queries/transfer", () => ({
    buildDBWorkspaceExport: (...a: unknown[]) => buildDBWorkspaceExport(...a),
    buildDBItemsExport: (...a: unknown[]) => buildDBItemsExport(...a),
    buildDBItemExport: (...a: unknown[]) => buildDBItemExport(...a),
    importDBItems: (...a: unknown[]) => importDBItems(...a),
    importDBWorkspace: (...a: unknown[]) => importDBWorkspace(...a),
    suggestDBWorkspaceImportName: vi.fn(async () => "WS (importato)"),
    suggestDBItemNames: (...a: unknown[]) => suggestDBItemNames(...a),
    validateWorkspaceExport: (data: unknown) => data,
}))

import { exportItemToFile, exportItemsToFile, exportWorkspaceToFile, importItemsFromFile, importWorkspaceFromFile } from "./workspace-transfer"

beforeEach(() => {
    size = 10
    fileContent = "{}"
    suggestDBItemNames.mockReset().mockResolvedValue([{ type: "note", name: "N (2)" }, { type: "folder", name: "F" }])
    readTextFile.mockClear()
    importDBWorkspace.mockReset().mockResolvedValue({ workspaceId: 1, skippedAudio: 0 })
    importDBItems.mockReset().mockResolvedValue({ skippedAudio: 0, items: [] })
    buildDBItemExport.mockReset().mockResolvedValue({ format: "easytask-workspace" })
    open.mockReset().mockResolvedValue("/x/ws.easytask.json")
    buildDBWorkspaceExport.mockReset().mockResolvedValue({ format: "easytask-workspace", scope: "workspace" })
    buildDBItemsExport.mockReset().mockResolvedValue({ format: "easytask-workspace", scope: "items" })
    buildDBWorkspaceExport.mockReset().mockResolvedValue({ format: "easytask-workspace", scope: "workspace" })
    buildDBItemsExport.mockReset().mockResolvedValue({ format: "easytask-workspace", scope: "items" })
    save.mockReset().mockResolvedValue("/x/out.easytask.json")
    writeTextFile.mockReset()
})

describe("importWorkspaceFromFile", () => {
    it("rejects a file above the size limit before reading it", async () => {
        size = MAX_IMPORT_FILE_BYTES + 1
        await expect(importWorkspaceFromFile()).rejects.toMatchObject({ code: "TRANSFER_FILE_TOO_LARGE" })
        expect(readTextFile).not.toHaveBeenCalled()
    })

    it("imports a file within the limit with the proposed name when nobody is asked", async () => {
        await expect(importWorkspaceFromFile()).resolves.toEqual({ workspaceId: 1, skippedAudio: 0 })
        expect(readTextFile).toHaveBeenCalledTimes(1)
        expect(importDBWorkspace).toHaveBeenCalledWith({}, { name: "WS (importato)" })
    })

    it("lets the user choose the name, and imports nothing when the choice is cancelled", async () => {
        const choose = vi.fn(async (proposed: { name: string }[], submit: (names: string[]) => Promise<unknown>) => {
            expect(proposed).toEqual([{ type: "workspace", name: "WS (importato)" }])
            return submit(["Mio"])
        })
        await importWorkspaceFromFile(choose as never)
        expect(importDBWorkspace).toHaveBeenCalledWith({}, { name: "Mio" })

        importDBWorkspace.mockClear()
        await expect(importWorkspaceFromFile((async () => null) as never)).resolves.toBeNull()
        expect(importDBWorkspace).not.toHaveBeenCalled()
    })

    it("refuses an items file before asking any name", async () => {
        fileContent = JSON.stringify({ scope: "items" })
        const choose = vi.fn()
        await expect(importWorkspaceFromFile(choose as never)).rejects.toMatchObject({ code: "TRANSFER_ITEMS_FILE" })
        expect(choose).not.toHaveBeenCalled()
    })
})

describe("importItemsFromFile", () => {
    it("imports the file into the given workspace and folder, with the names the user chose", async () => {
        fileContent = JSON.stringify({ scope: "items" })
        await expect(importItemsFromFile(7, 3)).resolves.toEqual({ skippedAudio: 0, items: [] })
        expect(suggestDBItemNames).toHaveBeenCalledWith({ scope: "items" }, 7, 3)
        expect(importDBItems).toHaveBeenCalledWith({ scope: "items" }, 7, 3, { names: ["N (2)", "F"] })

        await importItemsFromFile(7, null, ((_: unknown, submit: (names: string[]) => Promise<unknown>) => submit(["A", "B"])) as never)
        expect(importDBItems).toHaveBeenLastCalledWith({ scope: "items" }, 7, null, { names: ["A", "B"] })
    })

    it("refuses a workspace file before asking any name", async () => {
        const choose = vi.fn()
        await expect(importItemsFromFile(7, null, choose as never)).rejects.toMatchObject({ code: "TRANSFER_WORKSPACE_FILE" })
        expect(choose).not.toHaveBeenCalled()
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

describe("exportWorkspaceToFile", () => {
    it("proposes the workspace name as file name and writes the pretty printed export", async () => {
        await expect(exportWorkspaceToFile({ id: 3, name: "Casa: spese?" })).resolves.toBe(true)
        expect(save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: "Casa_ spese_.easytask.json" }))
        expect(buildDBWorkspaceExport).toHaveBeenCalledWith(3)
        expect(writeTextFile).toHaveBeenCalledWith("/x/out.easytask.json", JSON.stringify({ format: "easytask-workspace", scope: "workspace" }, null, 2))
    })

    it("falls back to a generic file name when the name has no usable characters", async () => {
        await exportWorkspaceToFile({ id: 3, name: "   " })
        expect(save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: "workspace.easytask.json" }))
    })

    it("does nothing when the dialog is cancelled", async () => {
        save.mockResolvedValue(null)
        await expect(exportWorkspaceToFile({ id: 3, name: "W" })).resolves.toBe(false)
        expect(buildDBWorkspaceExport).not.toHaveBeenCalled()
        expect(writeTextFile).not.toHaveBeenCalled()
    })
})

describe("exportItemsToFile", () => {
    it("writes several items in one file named after the given name", async () => {
        const items = [{ type: "note" as const, id: 1 }, { type: "folder" as const, id: 2 }]
        await expect(exportItemsToFile(items, "Selezione")).resolves.toBe(true)
        expect(save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: "Selezione.easytask.json" }))
        expect(buildDBItemsExport).toHaveBeenCalledWith(items, "Selezione")
        expect(writeTextFile).toHaveBeenCalledTimes(1)
    })

    it("does nothing when the dialog is cancelled", async () => {
        save.mockResolvedValue(null)
        await expect(exportItemsToFile([{ type: "note", id: 1 }], "S")).resolves.toBe(false)
        expect(buildDBItemsExport).not.toHaveBeenCalled()
    })
})

describe("picking an import file", () => {
    it("returns null without reading anything when the dialog is cancelled", async () => {
        open.mockResolvedValue(null)
        await expect(importWorkspaceFromFile()).resolves.toBeNull()
        await expect(importItemsFromFile(1, null)).resolves.toBeNull()
        expect(readTextFile).not.toHaveBeenCalled()
    })

    it("rejects a file that is not valid JSON", async () => {
        fileContent = "{ not json"
        await expect(importWorkspaceFromFile()).rejects.toMatchObject({ code: "TRANSFER_INVALID_FILE" })
        expect(importDBWorkspace).not.toHaveBeenCalled()
    })
})
