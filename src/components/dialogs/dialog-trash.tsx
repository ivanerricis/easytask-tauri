import { useCallback, useEffect, useRef, useState } from "react"
import { Briefcase, FileText, Music, Folder, Layers, LayoutList, Loader2, RotateCcw, SquareCheck, Trash2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useActiveNoteActions } from "@/contexts/active-note-context"
import { formatDate, getErrorMessage } from "@/lib/utils"
import type { TrashItem } from "@/types/types"

type TrashSource = {
    load: () => Promise<TrashItem[]>
    restore: (item: TrashItem) => Promise<void>
    purge: (item: TrashItem) => Promise<void>
    empty: (items: TrashItem[]) => Promise<void>
}

const groups: { type: TrashItem["type"], label: string, icon: LucideIcon }[] = [
    { type: "workspace", label: "Workspace", icon: Briefcase },
    { type: "folder", label: "Cartelle", icon: Folder },
    { type: "note", label: "Note", icon: FileText },
    { type: "section_group", label: "Gruppi", icon: Layers },
    { type: "section", label: "Sezioni", icon: LayoutList },
    { type: "task", label: "Task", icon: SquareCheck },
    { type: "audio_file", label: "File audio", icon: Music },
]

// "YYYY-MM-DD HH:MM:SS" -> "DD-MM-YYYY HH:MM"
const formatTrashDate = (value: string) => {
    if (!value) return ""
    const [date, time] = value.split(" ")
    return time ? `${formatDate(date)} ${time.slice(0, 5)}` : formatDate(date)
}

type Confirm = { kind: "purge", item: TrashItem } | { kind: "empty" } | null

type DialogTrashViewProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    source: TrashSource
}

const DialogTrashView = ({ isOpen, onOpenChange, source }: DialogTrashViewProps) => {
    const [items, setItems] = useState<TrashItem[]>([])
    const [loaded, setLoaded] = useState(false)
    const [busy, setBusy] = useState(false)
    const [confirm, setConfirm] = useState<Confirm>(null)
    const sourceRef = useRef(source)
    useEffect(() => { sourceRef.current = source })

    const reload = useCallback(async () => {
        try {
            setItems(await sourceRef.current.load())
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }, [])

    useEffect(() => {
        if (!isOpen) return
        reload().finally(() => setLoaded(true))
        return () => setLoaded(false)
    }, [isOpen, reload])
    const isLoading = isOpen && !loaded

    const run = async (action: () => Promise<void>, successMessage: string) => {
        setBusy(true)
        try {
            await action()
            toast.success(successMessage)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            await reload()
            setBusy(false)
        }
    }

    const handleConfirm = async () => {
        const current = confirm
        setConfirm(null)
        if (!current) return
        if (current.kind === "purge") {
            await run(() => sourceRef.current.purge(current.item), "Elemento eliminato definitivamente")
        } else {
            await run(() => sourceRef.current.empty(items), "Cestino svuotato")
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Cestino</DialogTitle>
                        <DialogDescription>
                            Ripristina gli elementi eliminati oppure eliminali definitivamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                                <Loader2 className="size-4 animate-spin" /> Caricamento...
                            </div>
                        ) : items.length === 0 ? (
                            <p className="py-6 text-center text-muted-foreground text-sm">Il cestino è vuoto</p>
                        ) : (
                            groups.map(({ type, label, icon: Icon }) => {
                                const groupItems = items.filter(i => i.type === type)
                                if (groupItems.length === 0) return null
                                return (
                                    <section key={type} className="flex flex-col gap-1" aria-label={label}>
                                        <h2 className="text-xs font-semibold uppercase text-muted-foreground">{label}</h2>
                                        {groupItems.map(item => (
                                            <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 rounded-xs border p-2">
                                                <Icon className="size-4 shrink-0" />
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="truncate text-sm" title={item.name}>{item.name}</span>
                                                    <span className="truncate text-xs text-muted-foreground">
                                                        {[item.context, `Eliminato il ${formatTrashDate(item.deleted_at)}`].filter(Boolean).join(" · ")}
                                                    </span>
                                                </div>
                                                <TooltipCustom text="Ripristina">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        aria-label={`Ripristina ${item.name}`}
                                                        disabled={busy}
                                                        onClick={() => run(() => sourceRef.current.restore(item), "Elemento ripristinato")}
                                                    >
                                                        <RotateCcw />
                                                    </Button>
                                                </TooltipCustom>
                                                <TooltipCustom text="Elimina definitivamente">
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        aria-label={`Elimina definitivamente ${item.name}`}
                                                        disabled={busy}
                                                        onClick={() => setConfirm({ kind: "purge", item })}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </TooltipCustom>
                                            </div>
                                        ))}
                                    </section>
                                )
                            })
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="destructive"
                            disabled={busy || isLoading || items.length === 0}
                            onClick={() => setConfirm({ kind: "empty" })}
                        >
                            Svuota cestino
                        </Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Chiudi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirm?.kind === "empty" ? "Svuotare il cestino?" : "Eliminare definitivamente?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm?.kind === "empty"
                                ? "Tutti gli elementi nel cestino verranno eliminati per sempre. Questa azione non può essere annullata."
                                : "L'elemento verrà eliminato per sempre. Questa azione non può essere annullata."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handleConfirm}>
                            {confirm?.kind === "empty" ? "Conferma svuotamento" : "Conferma eliminazione"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

type DialogTrashProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

/** Trash of the current workspace (folders, notes, sections, tasks...). */
export const DialogTrash = ({ isOpen, onOpenChange }: DialogTrashProps) => {
    const { currentWorkspace } = useWorkspace()
    const { getTrash, restoreItem, purgeItem, emptyTrash, getWorkspaceData } = useWorkspaceActions()
    const { refreshActiveNote } = useActiveNoteActions()
    const workspaceID = currentWorkspace?.id

    const refresh = async () => {
        if (workspaceID === undefined) return
        await getWorkspaceData(workspaceID)
        await refreshActiveNote()
    }

    const source: TrashSource = {
        load: async () => workspaceID === undefined ? [] : getTrash(workspaceID),
        restore: async (item) => { await restoreItem(item.type, item.id); await refresh() },
        purge: async (item) => { await purgeItem(item.type, item.id); await refresh() },
        empty: async () => { if (workspaceID !== undefined) { await emptyTrash(workspaceID); await refresh() } },
    }

    return <DialogTrashView isOpen={isOpen} onOpenChange={onOpenChange} source={source} />
}

/** Trash of deleted workspaces (main page). */
export const DialogTrashWorkspaces = ({ isOpen, onOpenChange }: DialogTrashProps) => {
    const { getTrashedWorkspaces, restoreWorkspace, purgeWorkspace } = useWorkspace()

    const source: TrashSource = {
        load: async () => (await getTrashedWorkspaces()).map(w => ({
            type: "workspace" as const,
            id: w.id,
            name: w.name,
            context: "",
            deleted_at: w.deleted_at ?? "",
        })),
        restore: (item) => restoreWorkspace(item.id),
        purge: (item) => purgeWorkspace(item.id),
        empty: async (items) => { for (const item of items) await purgeWorkspace(item.id) },
    }

    return <DialogTrashView isOpen={isOpen} onOpenChange={onOpenChange} source={source} />
}
