import { useTranslation } from "react-i18next"
import { useEffect, useRef, useState } from "react"
import { LayoutTemplate } from "lucide-react"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { getErrorMessage } from "@/lib/utils"
import { countTemplateContent, type NoteTemplate } from "@/types/template"

type DialogPickTemplateProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    /** Called with the chosen template; the dialog closes itself. */
    onPick: (template: NoteTemplate) => void
}

/**
 * Lets the user choose one of the templates of the open workspace, with a search box (to create a note from it).
 * @category Dialogs
 */
export const DialogPickTemplate = ({ isOpen, onOpenChange, onPick }: DialogPickTemplateProps) => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { getTemplates } = useWorkspaceActions()
    const workspaceID = currentWorkspace?.id
    const [templates, setTemplates] = useState<NoteTemplate[]>([])
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const getTemplatesRef = useRef(getTemplates)
    useEffect(() => { getTemplatesRef.current = getTemplates })

    useEffect(() => {
        if (!isOpen || workspaceID === undefined) return
        let cancelled = false
        getTemplatesRef.current(workspaceID)
            .then(list => { if (!cancelled) setTemplates(list) })
            .catch(err => { if (!cancelled) setError(getErrorMessage(err)) })
            .finally(() => { if (!cancelled) setLoaded(true) })
        return () => { cancelled = true; setLoaded(false); setError(null) }
    }, [isOpen, workspaceID])

    return (
        <CommandDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={t("dialogs.pickTemplate.title")}
            description={t("dialogs.pickTemplate.description")}
            className="rounded-xs"
        >
            <CommandInput placeholder={t("dialogs.pickTemplate.placeholder")} />
            <CommandList>
                {error && <p role="alert" className="px-3 py-2 text-xs text-destructive break-words">{error}</p>}
                <CommandEmpty>{loaded && templates.length === 0 ? t("dialogs.pickTemplate.none") : t("common.noResults")}</CommandEmpty>
                <CommandGroup heading={t("dialogs.pickTemplate.heading")}>
                    {templates.map(template => {
                        const counts = countTemplateContent(template.content)
                        return (
                            <CommandItem
                                className="!p-2"
                                key={template.id}
                                value={`${template.name} ${template.id}`}
                                onSelect={() => {
                                    onOpenChange(false)
                                    onPick(template)
                                }}
                            >
                                <LayoutTemplate className="size-4" />
                                <span className="truncate">{template.name}</span>
                                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                    {t("common.counts.task", { count: counts.tasks })}
                                </span>
                            </CommandItem>
                        )
                    })}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
