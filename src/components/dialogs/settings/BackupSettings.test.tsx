import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { BackupSettings } from "./BackupSettings"
import type { BackupInfo } from "@/db/backup"

const createBackup = vi.fn()
const deleteBackup = vi.fn()
const listBackups = vi.fn()
const restoreBackup = vi.fn()
const saveBackupKeep = vi.fn()
const saveAutoBackup = vi.fn()
const invoke = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("@/db/backup", () => ({
    createBackup: (...a: unknown[]) => createBackup(...a),
    deleteBackup: (...a: unknown[]) => deleteBackup(...a),
    listBackups: () => listBackups(),
    restoreBackup: (...a: unknown[]) => restoreBackup(...a),
}))
vi.mock("@/lib/store/preferences", () => ({
    DEFAULT_BACKUP_KEEP: 7,
    MIN_BACKUP_KEEP: 1,
    MAX_BACKUP_KEEP: 100,
    clampBackupKeep: (v: number) => Math.min(100, Math.max(1, Math.round(v))),
    getBackupKeep: async () => 5,
    getAutoBackup: async () => true,
    saveBackupKeep: (...a: unknown[]) => saveBackupKeep(...a),
    saveAutoBackup: (...a: unknown[]) => saveAutoBackup(...a),
}))

const backup = (name: string, size: number, preRestore = false): BackupInfo => ({
    name, path: `/b/${name}`, size, date: new Date(2026, 0, 2, 10, 0, 0), preRestore,
})

beforeEach(() => {
    vi.clearAllMocks()
    listBackups.mockResolvedValue([
        backup("easytask-20260102-100000.db", 2048),
        backup("easytask-pre-restore-20260102-090000.db", 3 * 1024 * 1024, true),
    ])
    createBackup.mockResolvedValue(undefined)
    deleteBackup.mockResolvedValue(undefined)
    restoreBackup.mockResolvedValue(undefined)
    saveBackupKeep.mockResolvedValue(undefined)
    saveAutoBackup.mockResolvedValue(undefined)
    invoke.mockResolvedValue(undefined)
})

describe("BackupSettings", () => {
    it("lists the backups with their size and the stored preferences", async () => {
        render(<BackupSettings />)
        expect(await screen.findByText("2 KB")).toBeInTheDocument()
        expect(screen.getByText("3.0 MB")).toBeInTheDocument()
        expect(screen.getByText("(prima del ripristino)")).toBeInTheDocument()
        await waitFor(() => expect(screen.getByRole("spinbutton", { name: "Backup da conservare" })).toHaveValue(5))
        expect(screen.getByRole("switch", { name: "Backup automatico" })).toBeChecked()
    })

    it("backs up now and refreshes the list", async () => {
        const user = userEvent.setup()
        render(<BackupSettings />)
        await screen.findByText("2 KB")
        await user.click(screen.getByRole("button", { name: "Esegui backup" }))
        expect(createBackup).toHaveBeenCalledWith("manual")
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Backup creato."))
        expect(listBackups).toHaveBeenCalledTimes(2)
    })

    it("restores only after the confirmation", async () => {
        const user = userEvent.setup()
        render(<BackupSettings />)
        await screen.findByText("2 KB")
        await user.click(screen.getAllByRole("button", { name: "Ripristina" })[0])
        expect(restoreBackup).not.toHaveBeenCalled()
        await user.click(screen.getByRole("button", { name: "Ripristina e riavvia" }))
        await waitFor(() => expect(restoreBackup).toHaveBeenCalledWith("easytask-20260102-100000.db"))
    })

    it("does not restore when the confirmation is cancelled", async () => {
        const user = userEvent.setup()
        render(<BackupSettings />)
        await screen.findByText("2 KB")
        await user.click(screen.getAllByRole("button", { name: "Ripristina" })[0])
        await user.click(screen.getByRole("button", { name: "Annulla" }))
        expect(restoreBackup).not.toHaveBeenCalled()
    })

    it("deletes a backup", async () => {
        const user = userEvent.setup()
        render(<BackupSettings />)
        await screen.findByText("2 KB")
        await user.click(screen.getAllByRole("button", { name: "Elimina" })[0])
        await waitFor(() => expect(deleteBackup).toHaveBeenCalledWith("easytask-20260102-100000.db"))
    })

    it("saves the preferences and opens the backups folder", async () => {
        const user = userEvent.setup()
        render(<BackupSettings />)
        await screen.findByText("2 KB")
        await user.click(screen.getByRole("switch", { name: "Backup automatico" }))
        expect(saveAutoBackup).toHaveBeenCalledWith(false)
        const input = screen.getByRole("spinbutton", { name: "Backup da conservare" })
        await user.clear(input)
        await user.type(input, "12")
        expect(saveBackupKeep).toHaveBeenLastCalledWith(12)
        await user.click(screen.getByRole("button", { name: "Apri" }))
        expect(invoke).toHaveBeenCalledWith("open_data_folder", { subfolder: "backups" })
    })
})
