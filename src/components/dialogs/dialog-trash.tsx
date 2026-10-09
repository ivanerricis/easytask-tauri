import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import { useCallback, useEffect, useRef, useState } from "react"
import { RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "./dialog-confirm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormError } from "@/components/form-error"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useOptionalUndo } from "@/contexts/undo/use-undo"
import { getErrorMessage } from "@/lib/utils"
import { ItemRow, ListError, TypeTabs, ListSkeleton, TypeTabsSkeleton } from "./item-list-parts"
import { ITEM_ICONS, formatStoredDate } from "./item-list-utils"
import type { TrashItem } from "@/types/types"

type TrashSource = {
    /** The kinds of items this trash can hold, in the order of the tabs (a single one needs no tabs). */
    types: readonly TrashItem["type"][]
    load: () => Promise<TrashItem[]>
    restore: (item: TrashItem) => Promise<void>
    purge: (item: TrashItem) => Promise<void>
    empty: (items: TrashItem[]) => Promise<void>
}

/** The kinds of items of the trash of a workspace, in the order of the tabs. */
const WORKSPACE_TYPES: TrashItem["type"][] = ["folder", "note", "section_group", "section", "task", "audio_file", "note_template"]
const WORKSPACES_TYPES: TrashItem["type"][] = ["workspace"]

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
    const [selected, setSelected] = useState<TrashItem["type"] | null>(null)
    const sourceRef = useRef(source)
    useEffect(() => { sourceRef.current = source })

    // Error of an action (shown under the list) and error of the load (shown instead of the list)
    const [error, setError] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    const reload = useCallback(async () => {
        try {
            const list = await sourceRef.current.load()
            setLoadError(null)
            setItems(list)
            // The first time: show the first type that has something in it
            const types = sourceRef.current.types
            setSelected(current => current ?? types.find(type => list.some(i => i.type === type)) ?? types[0])
        } catch (err) {
            setLoadError(getErrorMessage(err))
        }
    }, [])

    useEffect(() => {
        if (!isOpen) return
        // eslint-disable-next-line react-hooks/set-state-in-effect -- load when the dialog opens
        reload().finally(() => setLoaded(true))
        return () => {
            setLoaded(false)
            setSelected(null)
        }
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

    const types = source.types
    const active = selected && types.includes(selected) ? selected : types[0]
    const activeItems = items.filter(i => i.type === active)
    const Icon = ITEM_ICONS[active]
    const hasTabs = types.length > 1

    // The rows of the selected kind of item
    const rows = items.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground text-sm">{t("trash.isEmpty")}</p>
            ) : activeItems.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground text-sm">{t("trash.emptyType")}</p>
            ) : activeItems.map(item => (
                <ItemRow key={`${item.type}-${item.id}`} icon={Icon} name={item.name} details={details(item)}>
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
    ))

    // With more kinds of items the dialog always has the two columns of TypeTabs (while loading with the skeleton of the same
    // layout, and when empty with every tab at 0), so nothing moves when the items arrive; a single kind of item, or a failed
    // load, use the plain layout with a single list
    const tabbed = hasTabs && (isLoading || loadError === null)
    const title = <DialogTitle>{t("trash.title")}</DialogTitle>
    const description = <DialogDescription>{t("trash.description")}</DialogDescription>
    const footer = (
        <>
            <FormError>{error}</FormError>
            {/* mt-auto: with few or no items the buttons stay at the bottom of the (fixed height) dialog */}
            <DialogFooter className="mt-auto">
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
        </>
    )

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
                <DialogContent className={tabbed
                    ? "sm:max-w-3xl h-[min(560px,85vh)] gap-0 overflow-hidden p-0"
                    : `flex flex-col h-[min(560px,85vh)] overflow-hidden ${hasTabs ? "sm:max-w-3xl" : "sm:max-w-xl"}`}>
                    {tabbed && isLoading ? (
                        <TypeTabsSkeleton heading={<DialogHeader>{title}</DialogHeader>} description={description} footer={footer} tabs={types.length} />
                    ) : tabbed ? (
                        <TypeTabs
                            types={types}
                            active={active}
                            onSelect={setSelected}
                            count={type => items.filter(i => i.type === type).length}
                            label={type => t(`trash.groups.${type}`)}
                            ariaLabel={t("trash.nav")}
                            heading={<DialogHeader>{title}</DialogHeader>}
                            description={description}
                            footer={footer}
                        >
                            {rows}
                        </TypeTabs>
                    ) : (
                        <>
                            <DialogHeader>
                                {title}
                                {description}
                            </DialogHeader>
                            {isLoading ? (
                                <ListSkeleton />
                            ) : loadError !== null ? (
                                <ListError message={loadError} onRetry={() => void reload()} />
                            ) : items.length === 0 ? (
                                <p className="py-6 text-center text-muted-foreground text-sm">{t("trash.isEmpty")}</p>
                            ) : (
                                <div className="min-w-0 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1">
                                    {rows}
                                </div>
                            )}
                            {footer}
                        </>
                    )}
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
        types: WORKSPACE_TYPES,
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
        types: WORKSPACES_TYPES,
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
