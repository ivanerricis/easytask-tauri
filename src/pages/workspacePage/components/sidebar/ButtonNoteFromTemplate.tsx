import { LayoutTemplate } from "lucide-react"
import { useTranslation } from "react-i18next"
import { lazy, useState } from "react"
import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { LazyMount } from "@/components/lazy-mount"
import type { NoteTemplate } from "@/types/template"

const DialogPickTemplate = lazy(() => import("@/components/dialogs/dialog-pick-template").then(m => ({ default: m.DialogPickTemplate })))
const DialogNoteFromTemplate = lazy(() => import("@/components/dialogs/dialog-note-from-template").then(m => ({ default: m.DialogNoteFromTemplate })))

/**
 * Header button: create a note from a template (first the template is chosen, then the note gets its name and folder).
 * @category Sidebar
 */
export const ButtonNoteFromTemplate = () => {
    const { t } = useTranslation()
    const [picking, setPicking] = useState(false)
    const [template, setTemplate] = useState<NoteTemplate | null>(null)

    return (
        <>
            <TooltipCustom text={t("sidebar.addNoteFromTemplate")}>
                <Button variant="buttonIcon" size="icon" aria-label={t("sidebar.addNoteFromTemplate")} onClick={() => setPicking(true)}>
                    <LayoutTemplate />
                </Button>
            </TooltipCustom>
            <LazyMount active={picking}>
                <DialogPickTemplate isOpen={picking} onOpenChange={setPicking} onPick={setTemplate} />
            </LazyMount>
            <LazyMount active={template !== null}>
                {template && (
                    <DialogNoteFromTemplate
                        key={template.id}
                        template={template}
                        isOpen
                        onOpenChange={open => { if (!open) setTemplate(null) }}
                    />
                )}
            </LazyMount>
        </>
    )
}
