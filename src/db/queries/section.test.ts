import { beforeEach, describe, expect, it, vi } from "vitest"
import { invoke } from "@tauri-apps/api/core"
import { createMockDb, createRecordingInvoke, type MockDb } from "@/test/db-mock"

let db: MockDb

vi.mock("../dbManager", () => ({ getDB: vi.fn(async () => db) }))
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }))

import { createDBSection, createDBSectionInGroup } from "./section"

let calls: ReturnType<typeof createRecordingInvoke>["calls"]

/** Makes the next db_transaction calls go to a recorder, optionally rejecting like the Rust command does. */
function mockTransaction(options: Parameters<typeof createRecordingInvoke>[0] = {}) {
    const recorder = createRecordingInvoke(options)
    calls = recorder.calls
    vi.mocked(invoke).mockImplementation(recorder.invoke as unknown as typeof invoke)
}

beforeEach(() => {
    db = createMockDb()
    mockTransaction()
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
    it("inserts the group then the section in one transaction, using a reference to the new group id", async () => {
        await createDBSection(3, "Title", 2)
        expect(invoke).toHaveBeenCalledTimes(1)
        expect(calls).toEqual([[
            { sql: "INSERT INTO section_group (noteID, position) VALUES (?, ?)", params: [3, 2] },
            { sql: "INSERT INTO section (groupID, title) VALUES (?, ?)", params: [{ $ref: 0, offset: 0 }, "Title"] },
        ]])
        expect(db.execute).not.toHaveBeenCalled()
    })

    it("maps a failure of the section insert (nothing is left behind: no cleanup statement is needed)", async () => {
        mockTransaction({ error: "statement 1 failed: UNIQUE constraint failed" })
        expect(await thrown(createDBSection(3, "Title", 0))).toEqual({
            code: "SECTION_EXISTS",
            message: "A section with this name already exists.",
        })
        expect(db.execute).not.toHaveBeenCalled()
    })

    it("maps a check failure", async () => {
        mockTransaction({ error: "statement 1 failed: CHECK constraint failed" })
        expect(await thrown(createDBSection(3, "", 0))).toEqual({
            code: "SECTION_CHECK_FAILED",
            message: "The section name cannot be empty.",
        })
    })

    it("maps an unknown failure of the group insert", async () => {
        mockTransaction({ error: "statement 0 failed: boom" })
        expect(await thrown(createDBSection(3, "T", 0))).toMatchObject({ code: "SECTION_UNKNOWN_ERROR" })
    })
})

describe("createDBSectionInGroup", () => {
    it("inserts the section", async () => {
        await createDBSectionInGroup(5, "S")
        expect(db.execute).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO section (groupID, title, position)"), [5, "S", 5])
    })

    it("maps errors", async () => {
        db.execute.mockRejectedValueOnce(new Error("UNIQUE"))
        expect(await thrown(createDBSectionInGroup(5, "S"))).toMatchObject({ code: "SECTION_EXISTS" })
    })
})
