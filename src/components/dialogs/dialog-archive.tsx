import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArchiveRestore, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "./dialog-confirm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TooltipCustom } from "@/components/tooltip-custom"
import { ItemRow, TypeTabs } from "./item-list-parts"
import { ITEM_ICONS, formatStoredDate, typePanelId, typeTabId } from "./item-list-utils"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { getErrorMessage } from "@/lib/utils"
import type { ArchiveItem, ArchiveItemType } from "@/types/types"

/** The kinds of items that can be archived, in the order of the tabs. */
const TYPES: ArchiveItemType[] = ["folder", "note", "section_group", "section"]

// Second line of a row: where it was, what it contained and when it was archived
const details = (item: ArchiveItem) =>
    [item.context, item.summary, i18n.t("archive.archivedOn", { date: formatStoredDate(item.archived_at) })].filter(Boolean).join(" · ")

type DialogArchiveProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

/** Archive of the current workspace: one tab per type of item (folders, notes, groups, sections) with restore and move to the trash. */
export const DialogArchive = ({ isOpen, onOpenChange }: DialogArchiveProps) => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { getArchive, unarchiveItem, deleteItem, getWorkspaceData } = useWorkspaceActions()
    const { refreshActiveNote } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const workspaceID = currentWorkspace?.id

    const [items, setItems] = useState<ArchiveItem[]>([])
    const [loaded, setLoaded] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selected, setSelected] = useState<ArchiveItemType | null>(null)
    const [toTrash, setToTrash] = useState<ArchiveItem | null>(null)

    // The handlers come from the context: keep the latest one without re-running the load effect
    const loadRef = useRef<() => Promise<ArchiveItem[]>>(async () => [])
    useEffect(() => {
        loadRef.current = async () => workspaceID === undefined ? [] : getArchive(workspaceID)
    })

    const reload = useCallback(async () => {
        try {
            const list = await loadRef.current()
            setItems(list)
            // The first time: show the first type that has something in it
            setSelected(current => current ?? TYPES.find(type => list.some(i => i.type === type)) ?? TYPES[0])
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }, [])

    useEffect(() => {
        if (!isOpen) return
        reload().finally(() => setLoaded(true))
        return () => {
            setLoaded(false)
            setSelected(null)
        }
    }, [isOpen, reload])
    const isLoading = isOpen && !loaded

    // Folders and notes live in the sidebar tree, groups and sections in the open note
    const refresh = async () => {
        if (workspaceID === undefined) return
        await getWorkspaceData(workspaceID)
        await refreshActiveNote()
    }

    const run = async (action: () => Promise<void>, successMessage: string) => {
        setBusy(true)
        setError(null)
        try {
            await action()
            toast.success(successMessage)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            await reload()
            setBusy(false)
        }
    }

    const handleRestore = (item: ArchiveItem) => run(async () => {
        await unarchiveItem(item.type, item.id)
        recorder.unarchive(item.type, item.id, item.name)
        await refresh()
    }, t("archive.restored"))

    const handleTrash = async () => {
        const item = toTrash
        setToTrash(null)
        if (!item) return
        await run(async () => {
            await deleteItem(item.type, item.id)
            recorder.remove(item.type, item.id, item.name)
            await refresh()
        }, t("archive.trashed"))
    }

    const active = selected ?? TYPES[0]
    const countOf = (type: ArchiveItemType) => items.filter(i => i.type === type).length
    const activeItems = items.filter(i => i.type === active)
    const Icon = ITEM_ICONS[active]

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="flex flex-col sm:max-w-3xl h-[min(560px,85vh)] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{t("archive.title")}</DialogTitle>
                        <DialogDescription>
                            {t("archive.description")}
                        </DialogDescription>
                    </DialogHeader>
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                            <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
                        </div>
                    ) : items.length === 0 ? (
                        <p className="py-6 text-center text-muted-foreground text-sm">{t("archive.isEmpty")}</p>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-4 min-h-0 flex-1">
                            <TypeTabs
                                types={TYPES}
                                active={active}
                                onSelect={setSelected}
                                count={countOf}
                                label={type => t(`archive.types.${type}`)}
                                ariaLabel={t("archive.nav")}
                                idPrefix="archive"
                            />
                            <div
                                role="tabpanel"
                                id={typePanelId("archive", active)}
                                aria-labelledby={typeTabId("archive", active)}
                                className="flex-1 min-w-0 overflow-y-auto pr-1 flex flex-col gap-1"
                            >
                                {activeItems.length === 0 ? (
                                    <p className="py-6 text-center text-muted-foreground text-sm">{t("archive.emptyType")}</p>
                                ) : activeItems.map(item => (
                                    <ItemRow key={`${item.type}-${item.id}`} icon={Icon} name={item.name} details={details(item)}>
                                        <TooltipCustom text={t("archive.restore")}>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label={t("archive.restoreAria", { name: item.name })}
                                                disabled={busy}
                                                onClick={() => handleRestore(item)}
                                            >
                                                <ArchiveRestore />
                                            </Button>
                                        </TooltipCustom>
                                        <TooltipCustom text={t("archive.trash")}>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                aria-label={t("archive.trashAria", { name: item.name })}
                                                disabled={busy}
                                                onClick={() => setToTrash(item)}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </TooltipCustom>
                                    </ItemRow>
                                ))}
                            </div>
                        </div>
                    )}
                    {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.close")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={toTrash !== null}
                onOpenChange={(open) => { if (!open) setToTrash(null) }}
                destructive
                initialFocus="cancel"
                title={t("archive.trashTitle")}
                description={t("archive.trashDescription")}
                confirm={{ label: t("archive.confirmTrash"), icon: Trash2, onClick: handleTrash }}
            />
        </>
    )
}
