import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { useActiveNote } from "@/contexts/use-active-note"
import { useAudioActions } from "@/contexts/use-audio"
import { useIsActiveDraft } from "@/contexts/use-template-drafts"
import { Music } from "lucide-react"

/**
 * Adds audio files to the first group of the open note (each group also has its own "Aggiungi file audio" menu item).
 * @category Sidebar
 */
export const ButtonUpload = () => {
    const { t } = useTranslation()
    const { noteDataTree } = useActiveNote()
    const { addFiles } = useAudioActions()
    const firstGroup = noteDataTree?.groups[0]
    // A template draft has no audio
    if (useIsActiveDraft()) return null

    return (
        <TooltipCustom text={t("sidebar.addAudioFirstGroup")}>
            {/* The span keeps the tooltip when the button is disabled (a disabled button gets no pointer events) */}
            <span className="inline-flex">
                <Button
                    variant={"buttonIcon"}
                    size={"icon"}
                    disabled={!firstGroup}
                    aria-label={t("sidebar.addAudioFirstGroup")}
                    onClick={() => { if (firstGroup) void addFiles(firstGroup.id) }}
                >
                    <Music />
                </Button>
            </span>
        </TooltipCustom>
    )
}
