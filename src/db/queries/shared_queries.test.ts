import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockDb, type MockDb } from "@/test/db-mock"

let db: MockDb

vi.mock("../dbManager", () => ({ getDB: vi.fn(async () => db) }))

import { deleteDBItem, renameDBItem, updateDBColor, type DBItemType } from "./shared_queries"

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

describe("item type whitelist", () => {
    const invalid = "task; DROP TABLE task" as DBItemType

    it("rejects unknown types in every function", async () => {
        for (const fn of [
            () => renameDBItem(invalid, 1, "x"),
            () => updateDBColor(invalid, 1, "#fff"),
            () => deleteDBItem(invalid, 1),
        ]) {
            expect(await thrown(fn())).toMatchObject({ code: "INVALID_ITEM_TYPE" })
        }
        expect(db.execute).not.toHaveBeenCalled()
        expect(db.select).not.toHaveBeenCalled()
    })

    it.each(["workspace", "folder", "note", "section", "section_group", "task"] as const)(
        "accepts %s",
        async (type) => {
            await expect(updateDBColor(type, 1, "#fff")).resolves.toBeUndefined()
            expect(db.execute).toHaveBeenCalledWith(`UPDATE ${type} SET color=? WHERE id=?`, ["#fff", 1])
        },
    )
})

describe("renameDBItem", () => {
    it("uses title for section", async () => {
        await renameDBItem("section", 3, "T")
        expect(db.execute).toHaveBeenCalledWith("UPDATE section SET title=? WHERE id=?", ["T", 3])
    })

    it("uses text for task", async () => {
        await renameDBItem("task", 4, "T")
        expect(db.execute).toHaveBeenCalledWith("UPDATE task SET text=? WHERE id=?", ["T", 4])
    })

    it("uses name for the other types", async () => {
        for (const type of ["workspace", "folder", "note", "section_group"] as const) {
            await renameDBItem(type, 1, "N")
            expect(db.execute).toHaveBeenLastCalledWith(`UPDATE ${type} SET name=? WHERE id=?`, ["N", 1])
        }
    })

    it("maps UNIQUE and CHECK errors", async () => {
        db.execute.mockRejectedValueOnce(new Error("UNIQUE constraint failed"))
        expect(await thrown(renameDBItem("folder", 1, "x"))).toEqual({
            code: "FOLDER_EXISTS",
            message: "An item with this name already exists.",
        })
        db.execute.mockRejectedValueOnce(new Error("CHECK constraint failed"))
        expect(await thrown(renameDBItem("folder", 1, ""))).toEqual({
            code: "FOLDER_CHECK_FAILED",
            message: "The name cannot be empty.",
        })
    })
})

describe("updateDBColor", () => {
    it("passes null when the color is undefined or null", async () => {
        await updateDBColor("note", 2)
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE note SET color=? WHERE id=?", [null, 2])
        await updateDBColor("note", 2, null)
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE note SET color=? WHERE id=?", [null, 2])
    })

    it("maps DB errors with the color messages", async () => {
        db.execute.mockRejectedValueOnce(new Error("CHECK constraint failed"))
        expect(await thrown(updateDBColor("note", 1, "bad"))).toEqual({
            code: "NOTE_CHECK_FAILED",
            message: "The color cannot be empty.",
        })
    })
})

describe("deleteDBItem", () => {
    it("deletes non-section items directly", async () => {
        await deleteDBItem("task", 9)
        expect(db.execute).toHaveBeenCalledWith("UPDATE task SET deleted_at = datetime('now','localtime') WHERE id=?", [9])
        expect(db.select).not.toHaveBeenCalled()
    })

    it("deletes only the section when the group has other sections", async () => {
        db.select
            .mockResolvedValueOnce([{ groupID: 5 }])
            .mockResolvedValueOnce([{ count: 2 }])
        await deleteDBItem("section", 7)
        expect(db.select).toHaveBeenNthCalledWith(1, "SELECT groupID FROM section WHERE id=?", [7])
        expect(db.select).toHaveBeenNthCalledWith(2, "SELECT COUNT(*) as count FROM section WHERE groupID=? AND deleted_at IS NULL", [5])
        expect(db.execute).toHaveBeenCalledTimes(1)
        expect(db.execute).toHaveBeenCalledWith("UPDATE section SET deleted_at = datetime('now','localtime') WHERE id=?", [7])
    })

    it("deletes the group when removing its last section", async () => {
        db.select
            .mockResolvedValueOnce([{ groupID: 5 }])
            .mockResolvedValueOnce([{ count: 1 }])
        await deleteDBItem("section", 7)
        expect(db.execute).toHaveBeenCalledTimes(1)
        expect(db.execute).toHaveBeenCalledWith("UPDATE section_group SET deleted_at = datetime('now','localtime') WHERE id=?", [5])
    })

    it("returns silently when the section does not exist", async () => {
        db.select.mockResolvedValueOnce([])
        await expect(deleteDBItem("section", 1)).resolves.toBeUndefined()
        expect(db.select).toHaveBeenCalledTimes(1)
        expect(db.execute).not.toHaveBeenCalled()
    })

    it("throws a DELETE_FAILED error when the DB fails", async () => {
        db.execute.mockRejectedValueOnce(new Error("disk full"))
        expect(await thrown(deleteDBItem("task", 1))).toEqual({
            code: "TASK_DELETE_FAILED",
            message: "Failed to delete item: disk full",
        })
    })

    it("throws when a select fails for a section", async () => {
        db.select.mockRejectedValueOnce("locked")
        expect(await thrown(deleteDBItem("section", 1))).toEqual({
            code: "SECTION_DELETE_FAILED",
            message: "Failed to delete item: locked",
        })
    })
})
