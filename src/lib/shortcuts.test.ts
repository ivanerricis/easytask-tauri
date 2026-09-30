import { describe, expect, it } from "vitest"
import {
    SHORTCUTS, bindingEquals, bindingFromEvent, findConflicts, findConflictsFor, formatBinding, getDefaultBindings, isValidBinding, matchBinding,
} from "./shortcuts"

const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init)

describe("matchBinding", () => {
    it("matches ctrl or meta, case-insensitively", () => {
        const b = { key: "n", ctrl: true }
        expect(matchBinding(key({ key: "n", ctrlKey: true }), b)).toBe(true)
        expect(matchBinding(key({ key: "N", metaKey: true }), b)).toBe(true)
        expect(matchBinding(key({ key: "n" }), b)).toBe(false)
        expect(matchBinding(key({ key: "n", ctrlKey: true, altKey: true }), b)).toBe(false)
        expect(matchBinding(key({ key: "n", ctrlKey: true, shiftKey: true }), b)).toBe(false)
    })

    it("requires alt exactly and ignores shift for symbols", () => {
        expect(matchBinding(key({ key: "n", altKey: true }), { key: "n", alt: true })).toBe(true)
        expect(matchBinding(key({ key: "n", ctrlKey: true }), { key: "n", alt: true })).toBe(false)
        expect(matchBinding(key({ key: "?", shiftKey: true }), { key: "?" })).toBe(true)
        expect(matchBinding(key({ key: "?", ctrlKey: true }), { key: "?" })).toBe(false)
    })
})

describe("formatBinding", () => {
    it("uses Italian labels", () => {
        expect(formatBinding({ key: "n", ctrl: true })).toEqual(["Ctrl", "N"])
        expect(formatBinding({ key: "Enter", shift: true })).toEqual(["Maiusc", "Invio"])
        expect(formatBinding({ key: "Escape", alt: true })).toEqual(["Alt", "Esc"])
    })
})

describe("bindingEquals and conflicts", () => {
    it("compares bindings ignoring key case and missing flags", () => {
        expect(bindingEquals({ key: "N", ctrl: true }, { key: "n", ctrl: true, alt: false })).toBe(true)
        expect(bindingEquals({ key: "n", ctrl: true }, { key: "n", alt: true })).toBe(false)
    })

    it("default bindings have no conflicts although Ctrl+N is used in two scopes", () => {
        expect(findConflicts(getDefaultBindings())).toEqual([])
        expect(SHORTCUTS.filter(s => s.defaultBinding?.key === "n" && s.defaultBinding.ctrl)).toHaveLength(2)
    })

    it("detects a clash inside a scope and with global shortcuts", () => {
        const bindings = { ...getDefaultBindings(), "go-home": { key: "o", ctrl: true } }
        expect(findConflicts(bindings)).toEqual([["go-home", "search-notes"]])
        expect(findConflictsFor("new-workspace", { key: "?" }, getDefaultBindings())).toEqual(["show-shortcuts"])
        expect(findConflictsFor("new-workspace", { key: "m", ctrl: true }, getDefaultBindings())).toEqual([])
    })
})

describe("recording helpers", () => {
    it("builds bindings from events and skips modifier-only presses", () => {
        expect(bindingFromEvent(key({ key: "Control", ctrlKey: true }))).toBeNull()
        expect(bindingFromEvent(key({ key: "K", ctrlKey: true, shiftKey: true }))).toEqual({ key: "k", ctrl: true, shift: true })
    })

    it("needs ctrl or alt unless it is a function key", () => {
        expect(isValidBinding({ key: "k" })).toBe(false)
        expect(isValidBinding({ key: "k", shift: true })).toBe(false)
        expect(isValidBinding({ key: "k", alt: true })).toBe(true)
        expect(isValidBinding({ key: "F2" })).toBe(true)
    })
})
