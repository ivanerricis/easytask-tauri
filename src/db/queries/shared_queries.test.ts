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
    it("stores the name of a group, and NULL for an empty or blank name", async () => {
        await renameDBItem("section_group", 1, "  Idee ")
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE section_group SET name=? WHERE id=?", ["Idee", 1])
        await renameDBItem("section_group", 1, "")
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE section_group SET name=? WHERE id=?", [null, 1])
        await renameDBItem("section_group", 1, "   ")
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE section_group SET name=? WHERE id=?", [null, 1])
    })

    it("uses title for section", async () => {
        await renameDBItem("section", 3, "T")
        expect(db.execute).toHaveBeenCalledWith("UPDATE section SET title=? WHERE id=?", ["T", 3])
    })

    it("uses text for task", async () => {
        await renameDBItem("task", 4, "T")
        expect(db.execute).toHaveBeenCalledWith("UPDATE task SET text=? WHERE id=?", ["T", 4])
    })

    it("uses name for the other types", async () => {
        for (const type of ["workspace", "folder", "note"] as const) {
            await renameDBItem(type, 1, "N")
            expect(db.execute).toHaveBeenLastCalledWith(`UPDATE ${type} SET name=? WHERE id=?`, ["N", 1])
        }
    })

    it("maps UNIQUE and CHECK errors", async () => {
        db.execute.mockRejectedValueOnce(new Error("UNIQUE constraint failed"))
        expect(await thrown(renameDBItem("folder", 1, "x"))).toEqual({
            code: "FOLDER_EXISTS",
            message: "Esiste già un elemento con questo nome.",
        })
        db.execute.mockRejectedValueOnce(new Error("CHECK constraint failed"))
        expect(await thrown(renameDBItem("folder", 1, ""))).toEqual({
            code: "FOLDER_CHECK_FAILED",
            message: "Il nome non può essere vuoto.",
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
            message: "Il colore non può essere vuoto.",
        })
    })
})

describe("deleteDBItem", () => {
    it("deletes non-section items directly", async () => {
        await deleteDBItem("task", 9)
        expect(db.execute).toHaveBeenCalledWith("UPDATE task SET deleted_at = datetime('now','localtime') WHERE id=? AND deleted_at IS NULL", [9])
        expect(db.select).not.toHaveBeenCalled()
    })

    it("deletes only the section, never its group (an emptied group stays)", async () => {
        await deleteDBItem("section", 7)
        expect(db.select).not.toHaveBeenCalled()
        expect(db.execute).toHaveBeenCalledTimes(1)
        expect(db.execute).toHaveBeenCalledWith("UPDATE section SET deleted_at = datetime('now','localtime') WHERE id=? AND deleted_at IS NULL", [7])
    })

    it("throws a DELETE_FAILED error when the DB fails", async () => {
        db.execute.mockRejectedValueOnce(new Error("disk full"))
        expect(await thrown(deleteDBItem("task", 1))).toEqual({
            code: "TASK_DELETE_FAILED",
            message: "Impossibile eliminare l'elemento: disk full",
        })
    })

    it("throws a DELETE_FAILED error for a section too", async () => {
        db.execute.mockRejectedValueOnce("locked")
        expect(await thrown(deleteDBItem("section", 1))).toEqual({
            code: "SECTION_DELETE_FAILED",
            message: "Impossibile eliminare l'elemento: locked",
        })
    })
})
