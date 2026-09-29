import { describe, expect, it } from "vitest"
import { createError, handleDBError } from "./error"

function catchThrown(fn: () => void): unknown {
    try {
        fn()
    } catch (e) {
        return e
    }
    throw new Error("expected function to throw")
}

describe("createError", () => {
    it("builds an object with code and message", () => {
        expect(createError("X", "msg")).toEqual({ code: "X", message: "msg" })
    })
})

describe("handleDBError", () => {
    it("maps UNIQUE errors with the default message", () => {
        const e = catchThrown(() => handleDBError(new Error("UNIQUE constraint failed: a.b"), "TASK"))
        expect(e).toEqual({ code: "TASK_EXISTS", message: "A record with this value already exists." })
    })

    it("maps UNIQUE errors with a custom message", () => {
        const e = catchThrown(() => handleDBError("UNIQUE", "NOTE", { UNIQUE: "custom" }))
        expect(e).toEqual({ code: "NOTE_EXISTS", message: "custom" })
    })

    it("maps CHECK errors", () => {
        expect(catchThrown(() => handleDBError("CHECK constraint failed", "TASK")))
            .toEqual({ code: "TASK_CHECK_FAILED", message: "A check constraint failed." })
        expect(catchThrown(() => handleDBError("CHECK constraint failed", "TASK", { CHECK: "empty" })))
            .toEqual({ code: "TASK_CHECK_FAILED", message: "empty" })
    })

    it("maps NOT NULL errors", () => {
        expect(catchThrown(() => handleDBError("NOT NULL constraint failed", "TASK")))
            .toEqual({ code: "TASK_REQUIRED", message: "A required field is missing." })
        expect(catchThrown(() => handleDBError("NOT NULL constraint failed", "TASK", { NOT_NULL: "req" })))
            .toEqual({ code: "TASK_REQUIRED", message: "req" })
    })

    it("gives UNIQUE precedence over CHECK", () => {
        const e = catchThrown(() => handleDBError("UNIQUE and CHECK", "X")) as { code: string }
        expect(e.code).toBe("X_EXISTS")
    })

    it("wraps unknown Error instances", () => {
        expect(catchThrown(() => handleDBError(new Error("boom"), "TASK")))
            .toEqual({ code: "TASK_UNKNOWN_ERROR", message: "An unknown error occurred: boom" })
    })

    it("wraps string errors", () => {
        expect(catchThrown(() => handleDBError("weird", "TASK")))
            .toEqual({ code: "TASK_UNKNOWN_ERROR", message: "An unknown error occurred: weird" })
    })

    it("wraps non-error values such as null and objects", () => {
        expect(catchThrown(() => handleDBError(null, "T")))
            .toEqual({ code: "T_UNKNOWN_ERROR", message: "An unknown error occurred: null" })
        expect(catchThrown(() => handleDBError({ a: 1 }, "T")))
            .toEqual({ code: "T_UNKNOWN_ERROR", message: "An unknown error occurred: [object Object]" })
    })
})
