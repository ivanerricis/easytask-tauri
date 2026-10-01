import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { saveShortcutOverrides } from "@/lib/store/shortcuts"
import { EmptyState } from "./empty-state"

describe("EmptyState", () => {
    it("shows title, description and the hint with its default keys", () => {
        render(<EmptyState title="Vuoto" description="Aggiungi qualcosa" hints={[{ label: "Nuova nota", shortcutId: "new-note" }]} />)
        expect(screen.getByText("Vuoto")).toBeInTheDocument()
        expect(screen.getByText("Aggiungi qualcosa")).toBeInTheDocument()
        const item = screen.getByRole("listitem")
        expect(item).toHaveTextContent("Nuova nota")
        expect(item.querySelectorAll("kbd")).toHaveLength(2)
        expect(item).toHaveTextContent("Ctrl+N")
    })

    it("follows the customized shortcut", async () => {
        await saveShortcutOverrides({ "new-note": { key: "j", ctrl: true } })
        render(<ShortcutsProvider><EmptyState title="Vuoto" hints={[{ label: "Nuova nota", shortcutId: "new-note" }]} /></ShortcutsProvider>)
        await waitFor(() => expect(screen.getByRole("listitem")).toHaveTextContent("Ctrl+J"))
    })

    it("renders fixed keys and an action, and no list without hints", () => {
        const { rerender } = render(<EmptyState title="T" hints={[{ label: "Conferma", keys: ["Invio"] }]} action={<button>Vai</button>} />)
        expect(screen.getByRole("listitem")).toHaveTextContent("ConfermaInvio")
        expect(screen.getByRole("button", { name: "Vai" })).toBeInTheDocument()
        rerender(<EmptyState title="T" />)
        expect(screen.queryByRole("list")).toBeNull()
    })
})
