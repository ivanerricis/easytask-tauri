import { useTranslation } from "react-i18next"
import { useCallback, useEffect, useRef, useState } from "react"
import { FilePlus, LayoutTemplate, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "./dialog-confirm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogNoteFromTemplate } from "@/components/dialogs/dialog-note-from-template"
import { formatDate, getErrorMessage } from "@/lib/utils"
import { countTemplateContent, type NoteTemplate } from "@/types/template"

// The search box is shown only when the list gets long
const SEARCH_THRESHOLD = 8

type DialogTemplatesProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Templates of the current workspace: create a note from a template, rename, refresh from the source note, delete
 * (soft delete: the template goes to the trash).
 * @category Dialogs
 */
export const DialogTemplates = ({ isOpen, onOpenChange }: DialogTemplatesProps) => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { getTemplates, updateTemplateFromNote } = useWorkspaceActions()
    const workspaceID = currentWorkspace?.id

    const [templates, setTemplates] = useState<NoteTemplate[]>([])
    const [loaded, setLoaded] = useState(false)
    const [busy, setBusy] = useState(false)
    const [search, setSearch] = useState("")
    const [creating, setCreating] = useState<NoteTemplate | null>(null)
    const [renaming, setRenaming] = useState<NoteTemplate | null>(null)
    const [deleting, setDeleting] = useState<NoteTemplate | null>(null)
    const [refreshing, setRefreshing] = useState<NoteTemplate | null>(null)
    const getTemplatesRef = useRef(getTemplates)
    useEffect(() => { getTemplatesRef.current = getTemplates })

    const reload = useCallback(async () => {
        if (workspaceID === undefined) return
        try {
            setTemplates(await getTemplatesRef.current(workspaceID))
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }, [workspaceID])

    useEffect(() => {
        if (!isOpen) return
        reload().finally(() => setLoaded(true))
        return () => setLoaded(false)
    }, [isOpen, reload])
    const isLoading = isOpen && !loaded

    const handleRefresh = async () => {
        const template = refreshing
        setRefreshing(null)
        if (!template) return
        setBusy(true)
        try {
            await updateTemplateFromNote(template.id)
            toast.success(t("dialogs.templates.updated"))
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            await reload()
            setBusy(false)
        }
    }

    const query = search.trim().toLowerCase()
    const visible = query ? templates.filter(tpl => tpl.name.toLowerCase().includes(query)) : templates

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t("dialogs.templates.title")}</DialogTitle>
                        <DialogDescription>
                            {t("dialogs.templates.description")}
                        </DialogDescription>
                    </DialogHeader>
                    {templates.length > SEARCH_THRESHOLD && (
                        <Input
                            aria-label={t("dialogs.templates.search")}
                            placeholder={t("dialogs.templates.searchPlaceholder")}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    )}
                    <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto pr-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                                <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
                            </div>
                        ) : templates.length === 0 ? (
                            <p className="py-6 text-center text-muted-foreground text-sm">
                                {t("dialogs.templates.empty")}
                            </p>
                        ) : visible.length === 0 ? (
                            <p className="py-6 text-center text-muted-foreground text-sm">{t("common.noResults")}</p>
                        ) : (
                            visible.map(template => {
                                const counts = countTemplateContent(template.content)
                                return (
                                    <div key={template.id} className="flex items-center gap-2 rounded-xs border p-2">
                                        <LayoutTemplate className="size-4 shrink-0" />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="truncate text-sm" title={template.name}>{template.name}</span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {template.sourceNoteName !== null ? t("dialogs.templates.from", { name: template.sourceNoteName }) : t("dialogs.templates.noteDeleted")}
                                                {" · "}{t("dialogs.templates.createdOn", { date: formatDate(template.creation_date) })}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {[
                                                    t("common.counts.group", { count: counts.groups }),
                                                    t("common.counts.section", { count: counts.sections }),
                                                    t("common.counts.task", { count: counts.tasks }),
                                                ].join(" · ")}
                                            </span>
                                        </div>
                                        <TooltipCustom text={t("dialogs.templates.createNote")}>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label={t("dialogs.templates.createNoteFrom", { name: template.name })}
                                                disabled={busy}
                                                onClick={() => setCreating(template)}
                                            >
                                                <FilePlus />
                                            </Button>
                                        </TooltipCustom>
                                        <TooltipCustom text={t("common.rename")}>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label={t("dialogs.templates.renameAria", { name: template.name })}
                                                disabled={busy}
                                                onClick={() => setRenaming(template)}
                                            >
                                                <Pencil />
                                            </Button>
                                        </TooltipCustom>
                                        <TooltipCustom text={template.sourceNoteName !== null ? t("dialogs.templates.refreshTooltip") : t("dialogs.templates.sourceMissing")}>
                                            {/* A disabled button gets no pointer events: the span keeps the tooltip working */}
                                            <span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label={t("dialogs.templates.refreshAria", { name: template.name })}
                                                    disabled={busy || template.sourceNoteName === null}
                                                    onClick={() => setRefreshing(template)}
                                                >
                                                    <RefreshCw />
                                                </Button>
                                            </span>
                                        </TooltipCustom>
                                        <TooltipCustom text={t("common.delete")}>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                aria-label={t("dialogs.templates.deleteAria", { name: template.name })}
                                                disabled={busy}
                                                onClick={() => setDeleting(template)}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </TooltipCustom>
                                    </div>
                                )
                            })
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.close")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {creating && (
                <DialogNoteFromTemplate
                    key={creating.id}
                    template={creating}
                    isOpen
                    onOpenChange={open => { if (!open) setCreating(null) }}
                    onCreated={() => onOpenChange(false)}
                />
            )}
            {renaming && (
                <DialogRenameItem
                    key={renaming.id}
                    item={renaming}
                    itemType="note_template"
                    isOpen
                    onOpenChange={open => { if (!open) setRenaming(null) }}
                    getItemId={renaming.id}
                    getItemData={reload}
                />
            )}
            {deleting && (
                <DialogDeleteItem
                    key={deleting.id}
                    item={deleting}
                    itemType="note_template"
                    isOpen
                    onOpenChange={open => { if (!open) setDeleting(null) }}
                    getItemId={deleting.id}
                    getItemData={reload}
                />
            )}
            <ConfirmDialog
                open={refreshing !== null}
                onOpenChange={open => { if (!open) setRefreshing(null) }}
                destructive
                initialFocus="cancel"
                title={t("dialogs.templates.refreshTitle")}
                description={t("dialogs.templates.refreshDescription", { name: refreshing?.name, note: refreshing?.sourceNoteName })}
                confirm={{ label: t("dialogs.templates.overwrite"), icon: RefreshCw, onClick: handleRefresh }}
            />
        </>
    )
}
