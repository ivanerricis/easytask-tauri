import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { getShortcutOverrides } from "@/lib/store/shortcuts"
import { ShortcutsSettings } from "./ShortcutsSettings"

const setup = () => render(<ShortcutsProvider><ShortcutsSettings /></ShortcutsProvider>)
const edit = (description: string) => fireEvent.click(screen.getByRole("button", { name: `Modifica: ${description}` }))
const press = (init: KeyboardEventInit) => act(() => { fireEvent.keyDown(window, init) })

describe("ShortcutsSettings", () => {
    it("records a new binding, saves it and lets the user reset it", async () => {
        setup()
        edit("Cerca una nota")
        press({ key: "k", ctrlKey: true })

        await waitFor(() => expect(screen.getByRole("button", { name: "Ripristina: Cerca una nota" })).toBeTruthy())
        expect(await getShortcutOverrides()).toEqual({ "search-notes": { key: "k", ctrl: true } })

        fireEvent.click(screen.getByRole("button", { name: "Ripristina: Cerca una nota" }))
        await waitFor(() => expect(screen.queryByRole("button", { name: "Ripristina: Cerca una nota" })).toBeNull())
        expect(await getShortcutOverrides()).toEqual({})
    })

    it("rejects a conflicting binding and keeps recording", async () => {
        setup()
        edit("Cerca una nota")
        press({ key: "h", ctrlKey: true })

        expect((await screen.findByRole("alert")).textContent).toContain("Torna alla Home")
        expect(await getShortcutOverrides()).toEqual({})
        expect(screen.getByText("Premi i tasti...")).toBeTruthy()
    })

    it("does not conflict across scopes and needs a modifier", async () => {
        setup()
        edit("Crea un nuovo workspace")
        press({ key: "q" })
        expect((await screen.findByRole("alert")).textContent).toContain("Ctrl o Alt")
        press({ key: "m", ctrlKey: true })
        await waitFor(() => expect(screen.getByRole("button", { name: "Ripristina: Crea un nuovo workspace" })).toBeTruthy())
    })

    it("Esc cancels and Ripristina tutte clears every override", async () => {
        setup()
        edit("Cerca una nota")
        press({ key: "Escape" })
        expect(screen.queryByText("Premi i tasti...")).toBeNull()
        expect(await getShortcutOverrides()).toEqual({})

        edit("Torna alla Home")
        press({ key: "j", altKey: true })
        await waitFor(() => expect(screen.getByRole("button", { name: "Ripristina tutte" })).toHaveProperty("disabled", false))
        fireEvent.click(screen.getByRole("button", { name: "Ripristina tutte" }))
        // A confirmation comes first: nothing is cleared until it is accepted
        const dialog = await screen.findByRole("alertdialog")
        expect(Object.keys(await getShortcutOverrides())).not.toHaveLength(0)
        fireEvent.click(within(dialog).getByRole("button", { name: "Ripristina tutte" }))
        await waitFor(() => expect(screen.getByRole("button", { name: "Ripristina tutte" })).toHaveProperty("disabled", true))
        expect(await getShortcutOverrides()).toEqual({})
    })
})
