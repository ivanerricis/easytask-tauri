import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockDb, type MockDb } from "@/test/db-mock"

let db: MockDb

vi.mock("../dbManager", () => ({ getDB: vi.fn(async () => db) }))

import { createDBSection, createDBSectionInGroup } from "./section"

beforeEach(() => {
    db = createMockDb()
})

async function thrown(p: Promise<unknown>): Promise<unknown> {
    try {
        await p
    } catch (e) {
        return e
    }
    throw new Error("expected rejection")
}

describe("createDBSection", () => {
    it("inserts the group then the section using the new group id", async () => {
        db.execute.mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 42 })
        await createDBSection(3, "Title", 2)
        expect(db.execute).toHaveBeenNthCalledWith(1, "INSERT INTO section_group (noteID, position) VALUES (?, ?)", [3, 2])
        expect(db.execute).toHaveBeenNthCalledWith(2, "INSERT INTO section (groupID, title) VALUES (?, ?)", [42, "Title"])
        expect(db.execute).toHaveBeenCalledTimes(2)
    })

    it("removes the orphan group when the section insert fails", async () => {
        db.execute
            .mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 42 })
            .mockRejectedValueOnce(new Error("UNIQUE constraint failed"))
        expect(await thrown(createDBSection(3, "Title", 0))).toEqual({
            code: "SECTION_EXISTS",
            message: "A section with this name already exists.",
        })
        expect(db.execute).toHaveBeenNthCalledWith(3, "DELETE FROM section_group WHERE id=?", [42])
    })

    it("still reports the original error when the cleanup fails", async () => {
        db.execute
            .mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 42 })
            .mockRejectedValueOnce(new Error("CHECK constraint failed"))
            .mockRejectedValueOnce(new Error("cleanup failed"))
        expect(await thrown(createDBSection(3, "", 0))).toEqual({
            code: "SECTION_CHECK_FAILED",
            message: "The section name cannot be empty.",
        })
    })

    it("does not run cleanup when the group insert fails", async () => {
        db.execute.mockRejectedValueOnce(new Error("boom"))
        expect(await thrown(createDBSection(3, "T", 0))).toMatchObject({ code: "SECTION_UNKNOWN_ERROR" })
        expect(db.execute).toHaveBeenCalledTimes(1)
    })
})

describe("createDBSectionInGroup", () => {
    it("inserts the section", async () => {
        await createDBSectionInGroup(5, "S")
        expect(db.execute).toHaveBeenCalledWith("INSERT INTO section (groupID, title) VALUES (?, ?)", [5, "S"])
    })

    it("maps errors", async () => {
        db.execute.mockRejectedValueOnce(new Error("UNIQUE"))
        expect(await thrown(createDBSectionInGroup(5, "S"))).toMatchObject({ code: "SECTION_EXISTS" })
    })
})
