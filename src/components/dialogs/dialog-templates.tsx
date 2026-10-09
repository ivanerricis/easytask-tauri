import { useTranslation } from "react-i18next"
import { useCallback, useEffect, useRef, useState } from "react"
import { FilePlus, LayoutTemplate, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "./dialog-confirm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormError } from "@/components/form-error"
import { Input } from "@/components/ui/input"
import { TooltipCustom } from "@/components/tooltip-custom"
import { ItemRow, ListError, ListSkeleton } from "./item-list-parts"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogNoteFromTemplate } from "@/components/dialogs/dialog-note-from-template"
import { DialogCreateTemplate } from "@/components/dialogs/dialog-create-template"
import { DialogPickNote } from "@/components/dialogs/dialog-pick-note"
import { useAllNotes } from "@/hooks/use-all-notes"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { formatDate, getErrorMessage } from "@/lib/utils"
import { countTemplateContent, type NoteTemplate } from "@/types/template"

// The search box is shown only when the list gets long
const SEARCH_THRESHOLD = 8

type DialogTemplatesProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Templates of the current workspace: create a template from one of the notes, create a note from a template, rename,
 * refresh from the source note, delete (soft delete: the template goes to the trash).
 * @category Dialogs
 */
export const DialogTemplates = ({ isOpen, onOpenChange }: DialogTemplatesProps) => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { getTemplates, updateTemplateFromNote } = useWorkspaceActions()
    const workspaceID = currentWorkspace?.id
    const allNotes = useAllNotes()

    const [templates, setTemplates] = useState<NoteTemplate[]>([])
    const [loaded, setLoaded] = useState(false)
    const { saving: busy, run } = useSubmitOnce()
    const [search, setSearch] = useState("")
    const [creating, setCreating] = useState<NoteTemplate | null>(null)
    const [renaming, setRenaming] = useState<NoteTemplate | null>(null)
    const [deleting, setDeleting] = useState<NoteTemplate | null>(null)
    const [refreshing, setRefreshing] = useState<NoteTemplate | null>(null)
    // Creating a template here: first the note is chosen, then the template gets its name
    const [picking, setPicking] = useState(false)
    const [source, setSource] = useState<{ id: number, name: string } | null>(null)
    const getTemplatesRef = useRef(getTemplates)
    useEffect(() => { getTemplatesRef.current = getTemplates })

    // Error of an action (shown under the list) and error of the load (shown instead of the list)
    const [error, setError] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    const reload = useCallback(async () => {
        if (workspaceID === undefined) return
        try {
            setTemplates(await getTemplatesRef.current(workspaceID))
            setLoadError(null)
        } catch (err) {
            setLoadError(getErrorMessage(err))
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
        setError(null)
        await run(async () => {
            try {
                await updateTemplateFromNote(template.id)
                toast.success(t("dialogs.templates.updated"))
            } catch (err) {
                setError(getErrorMessage(err))
            } finally {
                await reload()
            }
        })
    }

    const query = search.trim().toLowerCase()
    const visible = query ? templates.filter(tpl => tpl.name.toLowerCase().includes(query)) : templates

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="flex flex-col sm:max-w-xl h-[min(560px,85vh)] overflow-hidden">
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
                    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
                        {isLoading ? (
                            <ListSkeleton />
                        ) : loadError !== null ? (
                            <ListError message={loadError} onRetry={() => void reload()} />
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
                                    <ItemRow
                                        key={template.id}
                                        icon={LayoutTemplate}
                                        name={template.name}
                                        details={[
                                            `${template.sourceNoteName !== null ? t("dialogs.templates.from", { name: template.sourceNoteName }) : t("dialogs.templates.noteDeleted")} · ${t("dialogs.templates.createdOn", { date: formatDate(template.creation_date) })}`,
                                            [
                                                t("common.counts.group", { count: counts.groups }),
                                                t("common.counts.section", { count: counts.sections }),
                                                t("common.counts.task", { count: counts.tasks }),
                                            ].join(" · "),
                                        ]}
                                    >
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
                                    </ItemRow>
                                )
                            })
                        )}
                    </div>
                    <FormError>{error}</FormError>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.close")}
                        </Button>
                        <TooltipCustom text={allNotes.length === 0 ? t("dialogs.templates.noNotes") : undefined}>
                            {/* A disabled button gets no pointer events: the span keeps the tooltip working */}
                            <span className="inline-flex">
                                <Button
                                    className="max-sm:w-full"
                                    disabled={busy || allNotes.length === 0}
                                    onClick={() => setPicking(true)}
                                >
                                    <Plus />
                                    {t("dialogs.templates.new")}
                                </Button>
                            </span>
                        </TooltipCustom>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DialogPickNote
                isOpen={picking}
                onOpenChange={setPicking}
                onPick={setSource}
                title={t("dialogs.templates.pickNote.title")}
                description={t("dialogs.templates.pickNote.description")}
                placeholder={t("dialogs.templates.pickNote.placeholder")}
            />
            {source && (
                <DialogCreateTemplate
                    key={source.id}
                    note={source}
                    isOpen
                    onOpenChange={open => { if (!open) setSource(null) }}
                    onCreated={() => void reload()}
                />
            )}
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
