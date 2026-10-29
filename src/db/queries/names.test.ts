import { describe, expect, it } from "vitest"
import { uniqueName } from "./names"
import { newPositionSql, nextPositionSql } from "./sql"

const counter = (name: string, attempt: number) => `${name} (${attempt + 1})`

describe("uniqueName", () => {
    it("returns the name when free and numbers the clashes from 2", () => {
        expect(uniqueName("a", [], counter)).toBe("a")
        expect(uniqueName("a", ["a"], counter)).toBe("a (2)")
        expect(uniqueName("a", new Set(["a", "a (2)"]), counter)).toBe("a (3)")
    })

    it("is case sensitive unless asked", () => {
        expect(uniqueName("a", ["A"], counter)).toBe("a")
        expect(uniqueName("a", ["A"], counter, { caseInsensitive: true })).toBe("a (2)")
        expect(uniqueName("a", ["a", "A (2)"], counter, { caseInsensitive: true })).toBe("a (3)")
    })

    it("can always add a suffix", () => {
        const copy = (name: string, attempt: number) => attempt === 1 ? `${name} (copy)` : `${name} (copy ${attempt})`
        expect(uniqueName("a", [], copy, { allowOriginal: false })).toBe("a (copy)")
        expect(uniqueName("a", ["a (copy)"], copy, { allowOriginal: false })).toBe("a (copy 2)")
    })
})

describe("position SQL", () => {
    it("nextPositionSql builds the tail of an INSERT ... SELECT", () => {
        expect(nextPositionSql("note", "folderID = ? AND deleted_at IS NULL"))
            .toBe("COALESCE(MAX(position) + 1, 0) FROM note WHERE folderID = ? AND deleted_at IS NULL")
    })

    it("newPositionSql goes after the last sibling or before the first one", () => {
        expect(newPositionSql("bottom", "task", "x = ?")).toContain("MAX(position) + 1")
        expect(newPositionSql("top", "task", "x = ?")).toContain("MIN(position) - 1")
    })
})
