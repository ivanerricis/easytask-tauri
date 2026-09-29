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
        expect(db.execute).toHaveBeenCalledWith("INSERT INTO task (sectionID, text) VALUES (?, ?)", [1, "t"])
    })

    it("createDBSubTask", async () => {
        await createDBSubTask(2, "s")
        expect(db.execute).toHaveBeenCalledWith("INSERT INTO task (taskID, text) VALUES (?, ?)", [2, "s"])
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
            message: "A task with this name already exists.",
        })
        db.execute.mockRejectedValueOnce(new Error("CHECK constraint failed"))
        expect(await thrown(createDBSubTask(1, ""))).toEqual({
            code: "TASK_CHECK_FAILED",
            message: "The task name cannot be empty.",
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
            message: "Failed to update task description: locked",
        })
    })

    it("propagates getDB failures as mapped errors", async () => {
        const { getDB } = await import("../dbManager")
        vi.mocked(getDB).mockRejectedValueOnce(new Error("no db"))
        expect(await thrown(createDBTask(1, "t"))).toEqual({
            code: "TASK_UNKNOWN_ERROR",
            message: "An unknown error occurred: no db",
        })
    })
})
