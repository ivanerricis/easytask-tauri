import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Folder, Note } from "@/types/types"
import { useAllNotes } from "./use-all-notes"

const state: { notes: Note[] | undefined, folders: Folder[] | undefined } = { notes: [], folders: [] }
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceState: () => state }))

const note = (id: number, name: string) => ({ id, name }) as Note
const folder = (id: number, name: string, notes: Note[], subfolders: Folder[] = []) => ({ id, name, notes, subfolders }) as Folder

beforeEach(() => {
    state.notes = []
    state.folders = []
})

describe("useAllNotes", () => {
    it("lists the notes of the root and of every folder, with the path of the folder", () => {
        state.notes = [note(1, "Root")]
        state.folders = [
            folder(10, "Progetti", [note(2, "Sprint")], [folder(11, "Interni", [note(3, "Retro")], [folder(12, "2026", [note(4, "Q3")])])]),
            folder(20, "Archivio", []),
        ]
        const { result } = renderHook(() => useAllNotes())
        expect(result.current.map(({ note: n, path }) => [n.name, path])).toEqual([
            ["Root", ""],
            ["Sprint", "Progetti"],
            ["Retro", "Progetti / Interni"],
            ["Q3", "Progetti / Interni / 2026"],
        ])
    })

    it("builds the full path from the flat list of folders the workspace state holds", () => {
        const flatFolder = (id: number, name: string, folderID: number | null, notes: Note[] = []) =>
            ({ id, name, folderID, notes, subfolders: [] }) as unknown as Folder
        const flatNote = (id: number, name: string, folderID: number | null) => ({ id, name, folderID }) as Note
        // Like the state: every folder at the top level (subfolders too), parents first or last
        state.folders = [flatFolder(12, "2026", 11), flatFolder(10, "Progetti", null), flatFolder(11, "Interni", 10)]
        state.notes = [flatNote(1, "Root", null), flatNote(3, "Retro", 11), flatNote(4, "Q3", 12)]
        const { result } = renderHook(() => useAllNotes())
        expect(result.current.map(({ note: n, path }) => [n.name, path])).toEqual([
            ["Root", ""],
            ["Retro", "Progetti / Interni"],
            ["Q3", "Progetti / Interni / 2026"],
        ])
    })

    it("keeps the full path when a subfolder is both nested and listed flat", () => {
        const sub = folder(11, "Interni", [note(3, "Retro")])
        state.folders = [folder(10, "Progetti", [], [sub]), sub]
        const { result } = renderHook(() => useAllNotes())
        expect(result.current[0].path).toBe("Progetti / Interni")
    })

    it("lists a note once even if the root list and a folder both carry it", () => {
        state.notes = [note(1, "Doppia")]
        state.folders = [folder(10, "Cartella", [note(1, "Doppia")])]
        const { result } = renderHook(() => useAllNotes())
        expect(result.current).toHaveLength(1)
        expect(result.current[0].path).toBe("Cartella")
    })

    it("tells same-named notes apart by their folder", () => {
        state.folders = [folder(10, "A", [note(1, "Note")]), folder(20, "B", [note(2, "Note")])]
        const { result } = renderHook(() => useAllNotes())
        expect(result.current.map(item => item.path)).toEqual(["A", "B"])
    })

    it("is empty while the workspace is not loaded", () => {
        state.notes = undefined
        state.folders = undefined
        const { result } = renderHook(() => useAllNotes())
        expect(result.current).toEqual([])
    })

    it("keeps the same list while nothing changes", () => {
        state.notes = [note(1, "Root")]
        const { result, rerender } = renderHook(() => useAllNotes())
        const first = result.current
        rerender()
        expect(result.current).toBe(first)
    })
})
