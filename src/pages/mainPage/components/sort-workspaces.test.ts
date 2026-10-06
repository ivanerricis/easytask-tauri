import { describe, expect, it } from "vitest"
import { sortWorkspaces } from "./sort-workspaces"
import { makeWorkspace } from "@/test/ui-fixtures"

const a = makeWorkspace({ id: 1, name: "banana", creation_date: "2026-01-05", creation_time: "09:00:00", edit_date: "2026-03-01", edit_time: "10:00:00" })
const b = makeWorkspace({ id: 2, name: "Apple", creation_date: "2026-01-05", creation_time: "08:00:00", edit_date: "2026-03-02", edit_time: "08:00:00" })
const c = makeWorkspace({ id: 3, name: "cherry", creation_date: "2025-12-31", creation_time: "23:59:59", edit_date: "2026-03-02", edit_time: "09:00:00" })
const ids = (list: { id: number }[]) => list.map(w => w.id)

describe("sortWorkspaces", () => {
    it("sorts by last edit", () => {
        expect(ids(sortWorkspaces([a, b, c], { by: "edited", dir: "desc" }))).toEqual([3, 2, 1])
        expect(ids(sortWorkspaces([a, b, c], { by: "edited", dir: "asc" }))).toEqual([1, 2, 3])
    })

    it("sorts by creation date and time", () => {
        expect(ids(sortWorkspaces([a, b, c], { by: "created", dir: "asc" }))).toEqual([3, 2, 1])
        expect(ids(sortWorkspaces([a, b, c], { by: "created", dir: "desc" }))).toEqual([1, 2, 3])
    })

    it("sorts by name ignoring case", () => {
        expect(ids(sortWorkspaces([a, b, c], { by: "name", dir: "asc" }))).toEqual([2, 1, 3])
        expect(ids(sortWorkspaces([a, b, c], { by: "name", dir: "desc" }))).toEqual([3, 1, 2])
    })

    it("breaks name ties by last edit (newest first), then id", () => {
        const x = makeWorkspace({ id: 5, name: "same", edit_time: "10:00:00" })
        const y = makeWorkspace({ id: 4, name: "SAME", edit_time: "11:00:00" })
        const z = makeWorkspace({ id: 3, name: "Same", edit_time: "11:00:00" })
        expect(ids(sortWorkspaces([x, y, z], { by: "name", dir: "asc" }))).toEqual([3, 4, 5])
        expect(ids(sortWorkspaces([x, y, z], { by: "name", dir: "desc" }))).toEqual([3, 4, 5])
    })

    it("does not mutate the input", () => {
        const input = [a, b, c]
        sortWorkspaces(input, { by: "name", dir: "asc" })
        expect(ids(input)).toEqual([1, 2, 3])
    })
})
