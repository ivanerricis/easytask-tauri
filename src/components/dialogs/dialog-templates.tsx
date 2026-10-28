import { useTranslation } from "react-i18next"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { Copy, FilePlus, LayoutTemplate, MoreHorizontal, Pencil, Plus, FileInput, SquarePen, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "./dialog-confirm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormError } from "@/components/form-error"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { TooltipCustom } from "@/components/tooltip-custom"
import { ItemRow, ListError, ListSkeleton } from "./item-list-parts"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useTemplateDraftActions, useTemplateDrafts } from "@/contexts/use-template-drafts"
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
// Under this many templates the list is short: a hint says how to add more
const SHORT_LIST = 3

type DialogTemplatesProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Templates of the current workspace: create a template from one of the notes, create a note from a template, edit it
 * (in a tab), rename, duplicate, refresh from the source note or from another note, delete (soft delete: the template
 * goes to the trash).
 * @category Dialogs
 */
export const DialogTemplates = ({ isOpen, onOpenChange }: DialogTemplatesProps) => {
    const { t } = useTranslation()
    const reasonId = useId()
    const { currentWorkspace } = useWorkspace()
    const { getTemplates, updateTemplateFromNote, duplicateTemplate } = useWorkspaceActions()
    const drafts = useTemplateDrafts()
    const { openTemplateEditor, flushTemplate, refreshDrafts } = useTemplateDraftActions()
    const workspaceID = currentWorkspace?.id
    const allNotes = useAllNotes()

    const [templates, setTemplates] = useState<NoteTemplate[]>([])
    const [loaded, setLoaded] = useState(false)
    const { saving: busy, run } = useSubmitOnce()
    const [search, setSearch] = useState("")
    const [creating, setCreating] = useState<NoteTemplate | null>(null)
    const [renaming, setRenaming] = useState<NoteTemplate | null>(null)
    const [deleting, setDeleting] = useState<NoteTemplate | null>(null)
    // The template being refreshed; `note` is the other note chosen as the source (none = its source note)
    const [refreshing, setRefreshing] = useState<{ template: NoteTemplate, note?: { id: number, name: string } } | null>(null)
    // Choosing the other note to refresh a template from
    const [pickingFor, setPickingFor] = useState<NoteTemplate | null>(null)
    // Creating a template here: first the note is chosen, then the template gets its name
    const [picking, setPicking] = useState(false)
    const [source, setSource] = useState<{ id: number, name: string } | null>(null)
    const getTemplatesRef = useRef(getTemplates)
    const refreshDraftsRef = useRef(refreshDrafts)
    useEffect(() => { getTemplatesRef.current = getTemplates; refreshDraftsRef.current = refreshDrafts })

    // Error of an action (shown under the list) and error of the load (shown instead of the list)
    const [error, setError] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    const reload = useCallback(async () => {
        if (workspaceID === undefined) return
        try {
            setTemplates(await getTemplatesRef.current(workspaceID))
            setLoadError(null)
            // A renamed template renames the tab of its editor
            void refreshDraftsRef.current()
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

    // The template is saved first, so what the user sees in the list is what the action works on
    const saved = async (template: NoteTemplate) => {
        if (await flushTemplate(template.id)) return true
        setError(t("templateEditor.saveError"))
        return false
    }

    const handleEdit = async (template: NoteTemplate) => {
        setError(null)
        await run(async () => {
            try {
                await openTemplateEditor(template)
                onOpenChange(false)
            } catch (err) {
                setError(getErrorMessage(err))
            }
        })
    }

    const handleDuplicate = async (template: NoteTemplate) => {
        setError(null)
        await run(async () => {
            try {
                if (!await saved(template)) return
                await duplicateTemplate(template.id)
                toast.success(t("templateEditor.duplicated"))
            } catch (err) {
                setError(getErrorMessage(err))
            } finally {
                await reload()
            }
        })
    }

    const handleRefresh = async () => {
        const target = refreshing
        setRefreshing(null)
        if (!target) return
        const { template, note } = target
        setError(null)
        await run(async () => {
            try {
                if (note) await updateTemplateFromNote(template.id, note.id)
                else await updateTemplateFromNote(template.id)
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
                <DialogContent className="flex flex-col sm:max-w-xl max-h-[min(560px,85vh)] overflow-hidden">
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
                                // While its editor is open the content of the template changes by itself: no refresh from a note
                                const editing = drafts.some(draft => draft.templateId === template.id)
                                const refreshReason = editing ? t("templateEditor.refreshBlocked") : template.sourceNoteName === null ? t("dialogs.templates.sourceMissing") : null
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
                                                onClick={() => { void saved(template).then(ok => { if (ok) setCreating(template) }) }}
                                            >
                                                <FilePlus />
                                            </Button>
                                        </TooltipCustom>
                                        <TooltipCustom text={t("templateEditor.edit")}>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label={t("templateEditor.editAria", { name: template.name })}
                                                disabled={busy}
                                                onClick={() => void handleEdit(template)}
                                            >
                                                <SquarePen />
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
                                        <TooltipCustom text={refreshReason ?? t("dialogs.templates.refreshTooltip")}>
                                            {/* A disabled button gets no pointer events: the span keeps the tooltip working */}
                                            <span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label={t("dialogs.templates.refreshAria", { name: template.name })}
                                                    aria-describedby={refreshReason !== null ? `${reasonId}-source-${template.id}` : undefined}
                                                    aria-disabled={refreshReason !== null || undefined}
                                                    disabled={busy}
                                                    className="aria-disabled:opacity-50 aria-disabled:pointer-events-none"
                                                    onClick={() => { if (refreshReason === null) setRefreshing({ template }) }}
                                                >
                                                    <FileInput />
                                                </Button>
                                                {/* aria-disabled, not disabled: the button stays focusable and the reason is read aloud */}
                                                {refreshReason !== null && <span id={`${reasonId}-source-${template.id}`} className="sr-only">{refreshReason}</span>}
                                            </span>
                                        </TooltipCustom>
                                        <DropdownMenu>
                                            <TooltipCustom text={t("templateEditor.moreTooltip")}>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        aria-label={t("templateEditor.moreAria", { name: template.name })}
                                                        disabled={busy}
                                                    >
                                                        <MoreHorizontal />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipCustom>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => void handleDuplicate(template)}>
                                                    <Copy />
                                                    {t("templateEditor.duplicate")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem disabled={editing} onSelect={() => setPickingFor(template)}>
                                                    <FileInput />
                                                    {t("templateEditor.refreshFromOther")}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <span aria-hidden className="mx-0.5 w-px self-stretch bg-border" />
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
                    {!isLoading && loadError === null && templates.length > 0 && templates.length <= SHORT_LIST && (
                        <p className="text-center text-xs text-muted-foreground">{t("dialogs.templates.shortHint")}</p>
                    )}
                    <FormError>{error}</FormError>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.close")}
                        </Button>
                        <TooltipCustom text={allNotes.length === 0 ? t("dialogs.templates.noNotes") : undefined}>
                            {/* A disabled button gets no pointer events: the span keeps the tooltip working */}
                            <span className="inline-flex">
                                <Button
                                    className="max-sm:w-full aria-disabled:opacity-50 aria-disabled:pointer-events-none"
                                    disabled={busy}
                                    aria-disabled={allNotes.length === 0 || undefined}
                                    aria-describedby={allNotes.length === 0 ? `${reasonId}-no-notes` : undefined}
                                    onClick={() => { if (allNotes.length > 0) setPicking(true) }}
                                >
                                    <Plus />
                                    {t("dialogs.templates.new")}
                                </Button>
                                {allNotes.length === 0 && <span id={`${reasonId}-no-notes`} className="sr-only">{t("dialogs.templates.noNotes")}</span>}
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
            <DialogPickNote
                isOpen={pickingFor !== null}
                onOpenChange={open => { if (!open) setPickingFor(null) }}
                onPick={note => { if (pickingFor) setRefreshing({ template: pickingFor, note }) }}
                title={t("templateEditor.pickOther.title")}
                description={t("templateEditor.pickOther.description")}
                placeholder={t("templateEditor.pickOther.placeholder")}
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
                description={refreshing?.note
                    ? t("templateEditor.refreshOtherDescription", { name: refreshing.template.name, note: refreshing.note.name })
                    : t("dialogs.templates.refreshDescription", { name: refreshing?.template.name, note: refreshing?.template.sourceNoteName })}
                confirm={{ label: t("dialogs.templates.overwrite"), icon: FileInput, onClick: handleRefresh }}
            />
        </>
    )
}
