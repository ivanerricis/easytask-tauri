import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DialogImportNames } from "./dialog-import-names"

const proposed = [{ type: "folder" as const, name: "Cartella (2)" }, { type: "note" as const, name: "Nota" }]

describe("DialogImportNames", () => {
    it("shows the proposed names and imports with the edited ones", async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn().mockResolvedValue(undefined)
        render(<DialogImportNames proposed={proposed} onSubmit={onSubmit} onCancel={vi.fn()} />)

        const folder = screen.getByLabelText("Nome della cartella")
        expect(folder).toHaveValue("Cartella (2)")
        expect(screen.getByLabelText("Nome della nota")).toHaveValue("Nota")
        await user.clear(folder)
        await user.type(folder, "Archivio vecchio{Enter}")
        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(["Archivio vecchio", "Nota"]))
    })

    it("keeps the dialog open with the error when the import refuses a name", async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn().mockRejectedValue(new Error("Esiste già un elemento chiamato \"Nota\" in questa posizione."))
        render(<DialogImportNames proposed={proposed} onSubmit={onSubmit} onCancel={vi.fn()} />)
        await user.click(screen.getByRole("button", { name: "Importa" }))
        expect(await screen.findByText(/Esiste già un elemento chiamato/)).toBeInTheDocument()
        expect(screen.getByLabelText("Nome della nota")).toBeInTheDocument()
    })

    it("does not import an empty name and cancels on demand", async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        const onCancel = vi.fn()
        render(<DialogImportNames proposed={[{ type: "workspace", name: "WS" }]} onSubmit={onSubmit} onCancel={onCancel} />)
        await user.clear(screen.getByLabelText("Nome del workspace"))
        expect(screen.getByRole("button", { name: "Importa" })).toBeDisabled()
        expect(screen.getByText("Il nome non può essere vuoto.")).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Annulla" }))
        expect(onCancel).toHaveBeenCalledTimes(1)
        expect(onSubmit).not.toHaveBeenCalled()
    })
})
