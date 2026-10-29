import { afterEach, describe, expect, it } from "vitest"
import { isDialogOpen } from "./dialog-open"

const add = (role: string) => {
    const el = document.createElement("div")
    el.setAttribute("role", role)
    document.body.appendChild(el)
    return el
}

afterEach(() => { document.body.innerHTML = "" })

describe("isDialogOpen", () => {
    it("is false without dialogs", () => {
        expect(isDialogOpen()).toBe(false)
    })

    it("sees a dialog", () => {
        add("dialog")
        expect(isDialogOpen()).toBe(true)
    })

    it("sees an alert dialog (confirmations)", () => {
        add("alertdialog")
        expect(isDialogOpen()).toBe(true)
    })

    it("ignores other roles", () => {
        add("menu")
        expect(isDialogOpen()).toBe(false)
    })
})
