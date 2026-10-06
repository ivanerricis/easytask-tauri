import { describe, expect, it } from "vitest"
import { buildPositionUpdate, clampIndex } from "./ordering"

describe("clampIndex", () => {
    it("keeps the index inside [0, length] and truncates", () => {
        expect(clampIndex(-3, 4)).toBe(0)
        expect(clampIndex(9, 4)).toBe(4)
        expect(clampIndex(2.9, 4)).toBe(2)
        expect(clampIndex(Number.NaN, 4)).toBe(0)
    })
})

describe("buildPositionUpdate", () => {
    it("assigns sequential positions with one CASE", () => {
        const { sql, params } = buildPositionUpdate("section", [7, 3])
        expect(sql).toBe("UPDATE section SET position = CASE id WHEN ? THEN ? WHEN ? THEN ? END WHERE id IN (?,?)")
        expect(params).toEqual([7, 0, 3, 1, 7, 3])
    })

    it("sets the parent column first when given", () => {
        const { sql, params } = buildPositionUpdate("note", [5], { column: "folderID", value: null })
        expect(sql).toBe("UPDATE note SET folderID = ?, position = CASE id WHEN ? THEN ? END WHERE id IN (?)")
        expect(params).toEqual([null, 5, 0, 5])
    })
})
