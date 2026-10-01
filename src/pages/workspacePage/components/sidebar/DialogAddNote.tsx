import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useShortcut } from "@/hooks/use-shortcut"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/native-select"
import { useTemplates } from "@/hooks/use-templates"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { FilePlus, Palette, X } from "lucide-react"
import { useState } from "react"

const defaultNote = {
    name: "",
    color: "#ffb375"
}

export function DialogAddNote() {
    const { t } = useTranslation()

    const [note, setNote] = useState(defaultNote)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const [templateId, setTemplateId] = useState("")
    const { currentWorkspace } = useWorkspace()
    const { createWorkspaceNote, createNoteFromTemplate } = useWorkspaceData()
    const templates = useTemplates(isOpen)
    // A stale selection (template deleted meanwhile) behaves as "no template"
    const template = templates.find(tpl => String(tpl.id) === templateId)

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        if (note.name.trim() === "") return
        try {
            // Both are added to the sidebar tree by the context
            if (template)
                await createNoteFromTemplate(template.id, currentWorkspace.id, null, note.name.trim(), template.color)
            else
                await createWorkspaceNote(currentWorkspace.id, note.name.trim(), paletteIsOpen ? note.color : undefined)
            setError(null)
            setIsOpen(false)
            setNote(defaultNote)
            setTemplateId("")
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    const handleCancel = () => {
        setNote(defaultNote)
        setError(null)
        setPaletteOpen(false)
        setTemplateId("")
        setIsOpen(false)
    }

    useShortcut("new-note", () => {
        setNote(defaultNote)
        setError(null)
        setPaletteOpen(false)
        setTemplateId("")
        setIsOpen(true)
    })
    const shortcutLabel = useShortcutLabel("new-note")

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("dialogs.addNote.title")}</DialogTitle>
                        <DialogDescription />
                    </DialogHeader>
                    <form onSubmit={handleCreateNote}>
                        <div className="grid gap-4">
                            <div className="grid gap-3">
                                <Label>{t("common.name")}</Label>
                                <Input
                                    id="name-1"
                                    name="name"
                                    value={note.name}
                                    onChange={e => {
                                        setError(null)
                                        setNote({
                                            ...note,
                                            name: e.target.value
                                        })
                                    }}
                                />
                            </div>
                            {templates.length > 0 && (
                                <div className="grid gap-3">
                                    <Label htmlFor="template-1">{t("dialogs.addNote.fromTemplate")}</Label>
                                    <NativeSelect
                                        id="template-1"
                                        value={template ? templateId : ""}
                                        onChange={e => setTemplateId(e.target.value)}
                                    >
                                        <option value="">{t("dialogs.addNote.noTemplate")}</option>
                                        {templates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                                    </NativeSelect>
                                </div>
                            )}
                            {error && (<p className="text-xs text-destructive">{error}</p>)}
                            {template ? null : paletteIsOpen ?
                                <div className="flex items-center justify-between gap-1">
                                    <div
                                        className="flex items-center justify-center h-full w-full border rounded-xs"
                                        style={{ backgroundColor: note.color }}
                                    >
                                        <Input
                                            id="color-1"
                                            name="color"
                                            type="color"
                                            className="opacity-0 cursor-pointer"
                                            value={note.color}
                                            onChange={e => setNote({
                                                ...note,
                                                color: e.target.value
                                            })}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            setPaletteOpen(false)
                                        }}
                                        variant={"buttonIcon"}
                                        className="h-full"
                                    >
                                        <X />
                                    </Button>
                                </div>
                                :
                                <Button
                                    type="button"
                                    variant={"outline"}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setPaletteOpen(true)
                                    }}
                                    className="h-full">
                                    {t("common.addColor")}
                                    <Palette />
                                </Button>
                            }
                        </div>
                        <DialogFooter className="mt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={handleCancel}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={!note.name.trim()}>
                                {t("dialogs.addNote.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <TooltipCustom text={t("sidebar.addNote")} shortcut={shortcutLabel}>
                <Button
                    onClick={() => setIsOpen(true)}
                    variant='buttonIcon'
                    size="icon"
                    aria-label={t("sidebar.addNote")}
                >
                    <FilePlus />
                </Button>
            </TooltipCustom>
        </>
    )
}