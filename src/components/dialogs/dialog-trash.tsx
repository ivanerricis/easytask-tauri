import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "./dialog-confirm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useOptionalUndo } from "@/contexts/undo/use-undo"
import { getErrorMessage } from "@/lib/utils"
import { ItemRow } from "./item-list-parts"
import { ITEM_ICONS, formatStoredDate } from "./item-list-utils"
import type { TrashItem } from "@/types/types"

type TrashSource = {
    load: () => Promise<TrashItem[]>
    restore: (item: TrashItem) => Promise<void>
    purge: (item: TrashItem) => Promise<void>
    empty: (items: TrashItem[]) => Promise<void>
}

const groups: TrashItem["type"][] = ["workspace", "folder", "note", "section_group", "section", "task", "audio_file", "note_template"]

// Second line of a row: where it was, what it contained and when it was deleted
const details = (item: TrashItem) =>
    [item.context, item.summary, i18n.t("trash.deletedOn", { date: formatStoredDate(item.deleted_at) })].filter(Boolean).join(" · ")

type Confirm = { kind: "purge", item: TrashItem } | { kind: "empty" } | null

type DialogTrashViewProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    source: TrashSource
}

const DialogTrashView = ({ isOpen, onOpenChange, source }: DialogTrashViewProps) => {
    const { t } = useTranslation()
    const [items, setItems] = useState<TrashItem[]>([])
    const [loaded, setLoaded] = useState(false)
    const [busy, setBusy] = useState(false)
    const [confirm, setConfirm] = useState<Confirm>(null)
    const sourceRef = useRef(source)
    useEffect(() => { sourceRef.current = source })

    const [error, setError] = useState<string | null>(null)

    const reload = useCallback(async () => {
        try {
            setItems(await sourceRef.current.load())
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }, [])

    useEffect(() => {
        if (!isOpen) return
        reload().finally(() => setLoaded(true))
        return () => setLoaded(false)
    }, [isOpen, reload])
    const isLoading = isOpen && !loaded

    const run = async (action: () => Promise<void>, successMessage: string): Promise<boolean> => {
        setBusy(true)
        setError(null)
        try {
            await action()
            toast.success(successMessage)
            return true
        } catch (err) {
            setError(getErrorMessage(err))
            return false
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
            await run(() => sourceRef.current.purge(current.item), t("trash.purged"))
        } else {
            // Emptied: nothing left to show, close the dialog (on failure it stays open with the error)
            if (await run(() => sourceRef.current.empty(items), t("trash.emptied"))) onOpenChange(false)
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t("trash.title")}</DialogTitle>
                        <DialogDescription>
                            {t("trash.description")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                                <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
                            </div>
                        ) : items.length === 0 ? (
                            <p className="py-6 text-center text-muted-foreground text-sm">{t("trash.isEmpty")}</p>
                        ) : (
                            groups.map(type => {
                                const label = t(`trash.groups.${type}`)
                                const groupItems = items.filter(i => i.type === type)
                                if (groupItems.length === 0) return null
                                return (
                                    <section key={type} className="flex flex-col gap-1" aria-label={label}>
                                        <h3 className="text-xs font-semibold uppercase text-muted-foreground">{label}</h3>
                                        {groupItems.map(item => (
                                            <ItemRow key={`${item.type}-${item.id}`} icon={ITEM_ICONS[type]} name={item.name} details={details(item)}>
                                                <TooltipCustom text={t("trash.restore")}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        aria-label={t("trash.restoreAria", { name: item.name })}
                                                        disabled={busy}
                                                        onClick={() => run(() => sourceRef.current.restore(item), t("trash.restored"))}
                                                    >
                                                        <RotateCcw />
                                                    </Button>
                                                </TooltipCustom>
                                                <TooltipCustom text={t("trash.purge")}>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        aria-label={t("trash.purgeAria", { name: item.name })}
                                                        disabled={busy}
                                                        onClick={() => setConfirm({ kind: "purge", item })}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </TooltipCustom>
                                            </ItemRow>
                                        ))}
                                    </section>
                                )
                            })
                        )}
                    </div>
                    {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
                    <DialogFooter>
                        <Button
                            variant="destructive"
                            disabled={busy || isLoading || items.length === 0}
                            onClick={() => setConfirm({ kind: "empty" })}
                        >
                            <Trash2 />
                            {t("trash.empty")}
                        </Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.close")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={(open) => { if (!open) setConfirm(null) }}
                destructive
                initialFocus="cancel"
                title={confirm?.kind === "empty" ? t("trash.emptyTitle") : t("trash.purgeTitle")}
                description={confirm?.kind === "empty" ? t("trash.emptyDescription") : t("trash.purgeDescription")}
                confirm={{ label: confirm?.kind === "empty" ? t("trash.confirmEmpty") : t("trash.confirmPurge"), icon: Trash2, onClick: handleConfirm }}
            />
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
    const clearUndo = useOptionalUndo()?.clear
    const workspaceID = currentWorkspace?.id

    const refresh = async () => {
        if (workspaceID === undefined) return
        await getWorkspaceData(workspaceID)
        await refreshActiveNote()
    }

    // Ids of purged rows can be reused by new ones (no AUTOINCREMENT): the undo history must not outlive a purge
    const source: TrashSource = {
        load: async () => workspaceID === undefined ? [] : getTrash(workspaceID),
        restore: async (item) => { await restoreItem(item.type, item.id); await refresh() },
        purge: async (item) => { await purgeItem(item.type, item.id); clearUndo?.(); await refresh() },
        empty: async () => { if (workspaceID !== undefined) { await emptyTrash(workspaceID); clearUndo?.(); await refresh() } },
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
            summary: w.summary,
            deleted_at: w.deleted_at ?? "",
        })),
        restore: (item) => restoreWorkspace(item.id),
        purge: (item) => purgeWorkspace(item.id),
        empty: async (items) => { for (const item of items) await purgeWorkspace(item.id) },
    }

    return <DialogTrashView isOpen={isOpen} onOpenChange={onOpenChange} source={source} />
}
