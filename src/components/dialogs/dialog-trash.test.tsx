import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { DialogTrash, DialogTrashWorkspaces } from "./dialog-trash"
import { makeWorkspace } from "@/test/ui-fixtures"
import type { TrashItem } from "@/types/types"

const data = {
    getTrash: vi.fn(),
    restoreItem: vi.fn(),
    purgeItem: vi.fn(),
    emptyTrash: vi.fn(),
    getWorkspaceData: vi.fn(),
    getNoteData: vi.fn(),
    currentNote: { id: 9 } as { id: number } | null,
}
const ws = {
    currentWorkspace: makeWorkspace({ id: 4 }),
    getTrashedWorkspaces: vi.fn(),
    restoreWorkspace: vi.fn(),
    purgeWorkspace: vi.fn(),
}
vi.mock("@/contexts/workspace-data-context", () => ({ useWorkspaceData: () => data }))
vi.mock("@/contexts/workspace-context", () => ({ useWorkspace: () => ws }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const items: TrashItem[] = [
    { type: "folder", id: 1, name: "Cartella A", context: "", deleted_at: "2026-09-01 10:30:00" },
    { type: "note", id: 2, name: "Nota B", context: "Cartella A", deleted_at: "2026-09-02 08:05:00" },
    { type: "task", id: 3, name: "Task C", context: "Nota B › Sezione 1", deleted_at: "2026-09-03 12:00:00" },
]

describe("DialogTrash", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        data.currentNote = { id: 9 }
        data.getTrash.mockResolvedValue(items)
        data.restoreItem.mockResolvedValue(undefined)
        data.purgeItem.mockResolvedValue(undefined)
        data.emptyTrash.mockResolvedValue(undefined)
        data.getWorkspaceData.mockResolvedValue(undefined)
        data.getNoteData.mockResolvedValue(undefined)
    })

    it("renders items grouped by type with context and date", async () => {
        render(<DialogTrash isOpen onOpenChange={vi.fn()} />)
        expect(await screen.findByText("Cartella A")).toBeInTheDocument()
        expect(data.getTrash).toHaveBeenCalledWith(4)
        expect(screen.getByRole("region", { name: "Cartelle" })).toBeInTheDocument()
        expect(screen.getByRole("region", { name: "Note" })).toBeInTheDocument()
        expect(screen.getByRole("region", { name: "Task" })).toBeInTheDocument()
        expect(screen.queryByRole("region", { name: "Sezioni" })).not.toBeInTheDocument()
        expect(screen.getByText(/Cartella A · Eliminato il 02-09-2026 08:05/)).toBeInTheDocument()
    })

    it("shows the empty state and disables emptying", async () => {
        data.getTrash.mockResolvedValue([])
        render(<DialogTrash isOpen onOpenChange={vi.fn()} />)
        expect(await screen.findByText("Il cestino è vuoto")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Svuota cestino" })).toBeDisabled()
    })

    it("restores an item and reloads workspace and note data", async () => {
        const user = userEvent.setup()
        render(<DialogTrash isOpen onOpenChange={vi.fn()} />)
        await user.click(await screen.findByRole("button", { name: "Ripristina Nota B" }))

        await waitFor(() => expect(data.restoreItem).toHaveBeenCalledWith("note", 2))
        await waitFor(() => expect(data.getWorkspaceData).toHaveBeenCalledWith(4))
        expect(data.getNoteData).toHaveBeenCalledWith(9)
        expect(toast.success).toHaveBeenCalledWith("Elemento ripristinato")
        await waitFor(() => expect(data.getTrash).toHaveBeenCalledTimes(2))
    })

    it("shows the error toast when restore fails", async () => {
        const user = userEvent.setup()
        data.restoreItem.mockRejectedValue(new Error("Esiste già un elemento con questo nome"))
        render(<DialogTrash isOpen onOpenChange={vi.fn()} />)
        await user.click(await screen.findByRole("button", { name: "Ripristina Nota B" }))

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Esiste già un elemento con questo nome"))
    })

    it("purge requires confirmation", async () => {
        const user = userEvent.setup()
        render(<DialogTrash isOpen onOpenChange={vi.fn()} />)
        await user.click(await screen.findByRole("button", { name: "Elimina definitivamente Task C" }))
        expect(data.purgeItem).not.toHaveBeenCalled()

        const alert = await screen.findByRole("alertdialog")
        await user.click(within(alert).getByRole("button", { name: "Conferma eliminazione" }))
        await waitFor(() => expect(data.purgeItem).toHaveBeenCalledWith("task", 3))
        expect(data.getWorkspaceData).toHaveBeenCalledWith(4)
    })

    it("cancelling the purge confirmation does nothing", async () => {
        const user = userEvent.setup()
        render(<DialogTrash isOpen onOpenChange={vi.fn()} />)
        await user.click(await screen.findByRole("button", { name: "Elimina definitivamente Task C" }))
        const alert = await screen.findByRole("alertdialog")
        await user.click(within(alert).getByRole("button", { name: "Annulla" }))

        expect(data.purgeItem).not.toHaveBeenCalled()
    })

    it("empties the trash after confirmation", async () => {
        const user = userEvent.setup()
        render(<DialogTrash isOpen onOpenChange={vi.fn()} />)
        await screen.findByText("Cartella A")
        await user.click(screen.getByRole("button", { name: "Svuota cestino" }))
        expect(data.emptyTrash).not.toHaveBeenCalled()

        const alert = await screen.findByRole("alertdialog")
        await user.click(within(alert).getByRole("button", { name: "Conferma svuotamento" }))
        await waitFor(() => expect(data.emptyTrash).toHaveBeenCalledWith(4))
        expect(data.getWorkspaceData).toHaveBeenCalledWith(4)
    })
})

describe("DialogTrashWorkspaces", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        ws.getTrashedWorkspaces.mockResolvedValue([makeWorkspace({ id: 7, name: "Vecchio", deleted_at: "2026-09-05 09:00:00" })])
        ws.restoreWorkspace.mockResolvedValue(undefined)
        ws.purgeWorkspace.mockResolvedValue(undefined)
    })

    it("lists and restores trashed workspaces", async () => {
        const user = userEvent.setup()
        render(<DialogTrashWorkspaces isOpen onOpenChange={vi.fn()} />)
        expect(await screen.findByText("Vecchio")).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Ripristina Vecchio" }))
        await waitFor(() => expect(ws.restoreWorkspace).toHaveBeenCalledWith(7))
    })

    it("purges all workspaces when emptying", async () => {
        const user = userEvent.setup()
        render(<DialogTrashWorkspaces isOpen onOpenChange={vi.fn()} />)
        await screen.findByText("Vecchio")
        await user.click(screen.getByRole("button", { name: "Svuota cestino" }))
        await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Conferma svuotamento" }))
        await waitFor(() => expect(ws.purgeWorkspace).toHaveBeenCalledWith(7))
    })
})
