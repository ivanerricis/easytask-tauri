import { beforeEach, describe, expect, it, vi } from "vitest"
import { store } from "./initStore"
import { getShortcutOverrides, sanitizeShortcutOverrides } from "./shortcuts"

vi.mock("./initStore", () => ({
    store: { get: vi.fn(), set: vi.fn(), save: vi.fn() },
}))

describe("sanitizeShortcutOverrides", () => {
    it("keeps valid overrides of editable shortcuts", () => {
        expect(sanitizeShortcutOverrides({ "go-home": { key: "k", ctrl: true }, undo: { key: "u", ctrl: true, alt: false, shift: true } }))
            .toEqual({ "go-home": { key: "k", ctrl: true }, undo: { key: "u", ctrl: true, alt: false, shift: true } })
    })

    it("drops unknown ids, non editable shortcuts and documentation-only entries", () => {
        expect(sanitizeShortcutOverrides({
            ghost: { key: "a", ctrl: true },
            "show-shortcuts": { key: "a", ctrl: true },
            "redo-alt": { key: "a", ctrl: true },
            "confirm-rename": { key: "a", ctrl: true },
        })).toEqual({})
    })

    it.each([
        [{ key: 3 }], [{ key: "" }], [{ ctrl: true }], [{ key: "a", ctrl: "yes" }], [{ key: "a", alt: 1 }], [{ key: "a", shift: null }], ["x"], [null], [[]],
    ])("drops the malformed binding %j", (binding) => {
        expect(sanitizeShortcutOverrides({ "go-home": binding })).toEqual({})
    })

    it.each([null, undefined, "x", 4, []])("returns an empty object for the non-object value %j", (value) => {
        expect(sanitizeShortcutOverrides(value)).toEqual({})
    })

    it("ignores extra fields of a binding", () => {
        expect(sanitizeShortcutOverrides({ "go-home": { key: "k", ctrl: true, extra: 1 } })).toEqual({ "go-home": { key: "k", ctrl: true } })
    })
})

describe("getShortcutOverrides", () => {
    beforeEach(() => vi.resetAllMocks())

    it("returns only the sanitized stored overrides", async () => {
        vi.mocked(store.get).mockResolvedValue({ "go-home": { key: "k", ctrl: true }, ghost: { key: "a" }, undo: { key: 1 } })
        expect(await getShortcutOverrides()).toEqual({ "go-home": { key: "k", ctrl: true } })
    })
})
