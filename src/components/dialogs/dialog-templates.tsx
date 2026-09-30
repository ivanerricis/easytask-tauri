import { useCallback, useEffect, useRef, useState } from "react"
import { FilePlus, LayoutTemplate, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogNoteFromTemplate } from "@/components/dialogs/dialog-note-from-template"
import { formatDate, getErrorMessage, plural } from "@/lib/utils"
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
            toast.success("Template aggiornato")
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            await reload()
            setBusy(false)
        }
    }

    const query = search.trim().toLowerCase()
    const visible = query ? templates.filter(t => t.name.toLowerCase().includes(query)) : templates

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Template</DialogTitle>
                        <DialogDescription>
                            Crea nuove note a partire da un template salvato.
                        </DialogDescription>
                    </DialogHeader>
                    {templates.length > SEARCH_THRESHOLD && (
                        <Input
                            aria-label="Cerca template"
                            placeholder="Cerca template..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    )}
                    <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto pr-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                                <Loader2 className="size-4 animate-spin" /> Caricamento...
                            </div>
                        ) : templates.length === 0 ? (
                            <p className="py-6 text-center text-muted-foreground text-sm">
                                Nessun template. Creane uno dal menu di una nota.
                            </p>
                        ) : visible.length === 0 ? (
                            <p className="py-6 text-center text-muted-foreground text-sm">Nessun risultato</p>
                        ) : (
                            visible.map(template => {
                                const counts = countTemplateContent(template.content)
                                return (
                                    <div key={template.id} className="flex items-center gap-2 rounded-xs border p-2">
                                        <LayoutTemplate className="size-4 shrink-0" />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="truncate text-sm" title={template.name}>{template.name}</span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {template.sourceNoteName !== null ? `Da: ${template.sourceNoteName}` : "Nota eliminata"}
                                                {" · "}Creato il {formatDate(template.creation_date)}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {[
                                                    plural(counts.groups, "gruppo", "gruppi"),
                                                    plural(counts.sections, "sezione", "sezioni"),
                                                    plural(counts.tasks, "task", "task"),
                                                ].join(" · ")}
                                            </span>
                                        </div>
                                        <TooltipCustom text="Crea nota">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label={`Crea nota da ${template.name}`}
                                                disabled={busy}
                                                onClick={() => setCreating(template)}
                                            >
                                                <FilePlus />
                                            </Button>
                                        </TooltipCustom>
                                        <TooltipCustom text="Rinomina">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label={`Rinomina ${template.name}`}
                                                disabled={busy}
                                                onClick={() => setRenaming(template)}
                                            >
                                                <Pencil />
                                            </Button>
                                        </TooltipCustom>
                                        <TooltipCustom text={template.sourceNoteName !== null ? "Aggiorna dalla nota" : "La nota di origine non esiste più"}>
                                            {/* A disabled button gets no pointer events: the span keeps the tooltip working */}
                                            <span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label={`Aggiorna ${template.name} dalla nota`}
                                                    disabled={busy || template.sourceNoteName === null}
                                                    onClick={() => setRefreshing(template)}
                                                >
                                                    <RefreshCw />
                                                </Button>
                                            </span>
                                        </TooltipCustom>
                                        <TooltipCustom text="Elimina">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                aria-label={`Elimina ${template.name}`}
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
                            Chiudi
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
            <AlertDialog open={refreshing !== null} onOpenChange={open => { if (!open) setRefreshing(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Aggiornare il template dalla nota?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Il contenuto del template "{refreshing?.name}" verrà sostituito con quello attuale della nota "{refreshing?.sourceNoteName}".
                            Le note già create dal template non cambiano.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handleRefresh}>
                            Sovrascrivi template
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
