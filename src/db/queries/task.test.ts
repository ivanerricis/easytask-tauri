import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockDb, type MockDb } from "@/test/db-mock"

let db: MockDb

vi.mock("../dbManager", () => ({ getDB: vi.fn(async () => db) }))

import {
    createDBSubTask,
    createDBTask,
    updateDBTaskCompletion,
    updateDBTaskDescription,
    updateDBTaskPriority,
} from "./task"

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

describe("task queries SQL", () => {
    it("createDBTask", async () => {
        await createDBTask(1, "t")
        expect(db.execute).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO task (sectionID, text, position)"), [1, "t", 1])
    })

    it("createDBTask and createDBSubTask return the id of the new row", async () => {
        db.execute.mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 42 })
        expect(await createDBTask(1, "t")).toBe(42)
        db.execute.mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 43 })
        expect(await createDBSubTask(2, "s")).toBe(43)
    })

    it("createDBSubTask", async () => {
        await createDBSubTask(2, "s")
        expect(db.execute).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO task (sectionID, taskID, text, position)"), ["s", 2, 2])
    })

    it("updateDBTaskPriority converts booleans to 0/1", async () => {
        await updateDBTaskPriority(3, true)
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE task SET priority=? WHERE id=?", [1, 3])
        await updateDBTaskPriority(3, false)
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE task SET priority=? WHERE id=?", [0, 3])
    })

    it("updateDBTaskCompletion converts booleans to 0/1", async () => {
        await updateDBTaskCompletion(4, true)
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE task SET completed=? WHERE id=?", [1, 4])
        await updateDBTaskCompletion(4, false)
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE task SET completed=? WHERE id=?", [0, 4])
    })

    it("updateDBTaskDescription passes null when missing", async () => {
        await updateDBTaskDescription(5, "d")
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE task SET description=? WHERE id=?", ["d", 5])
        await updateDBTaskDescription(5)
        expect(db.execute).toHaveBeenLastCalledWith("UPDATE task SET description=? WHERE id=?", [null, 5])
    })
})

describe("task queries errors", () => {
    it("maps UNIQUE and CHECK on create", async () => {
        db.execute.mockRejectedValueOnce(new Error("UNIQUE constraint failed"))
        expect(await thrown(createDBTask(1, "t"))).toEqual({
            code: "TASK_EXISTS",
            message: "Esiste già un task con questo nome.",
        })
        db.execute.mockRejectedValueOnce(new Error("CHECK constraint failed"))
        expect(await thrown(createDBSubTask(1, ""))).toEqual({
            code: "TASK_CHECK_FAILED",
            message: "Il nome del task non può essere vuoto.",
        })
    })

    it("maps unknown errors on priority and completion updates", async () => {
        db.execute.mockRejectedValueOnce(new Error("boom"))
        expect(await thrown(updateDBTaskPriority(1, true))).toMatchObject({ code: "TASK_UNKNOWN_ERROR" })
        db.execute.mockRejectedValueOnce(new Error("boom"))
        expect(await thrown(updateDBTaskCompletion(1, true))).toMatchObject({ code: "TASK_UNKNOWN_ERROR" })
    })

    it("wraps description update failures", async () => {
        db.execute.mockRejectedValueOnce(new Error("locked"))
        expect(await thrown(updateDBTaskDescription(1, "d"))).toEqual({
            code: "TASK_DESCRIPTION_UPDATE_FAILED",
            message: "Impossibile aggiornare la descrizione del task: locked",
        })
    })

    it("propagates getDB failures as mapped errors", async () => {
        const { getDB } = await import("../dbManager")
        vi.mocked(getDB).mockRejectedValueOnce(new Error("no db"))
        expect(await thrown(createDBTask(1, "t"))).toEqual({
            code: "TASK_UNKNOWN_ERROR",
            message: "Si è verificato un errore sconosciuto: no db",
        })
    })
})
