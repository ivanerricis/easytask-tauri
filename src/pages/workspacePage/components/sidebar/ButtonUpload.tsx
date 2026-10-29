import { useTranslation } from "react-i18next"
import { useActiveNote } from "@/contexts/use-active-note"
import { useAudioActions } from "@/contexts/use-audio"
import { useIsActiveDraft } from "@/contexts/use-template-drafts"
import { Music } from "lucide-react"
import { SidebarIconButton } from "./SidebarIconButton"

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
        <SidebarIconButton
            label={t("sidebar.addAudioFirstGroup")}
            icon={<Music />}
            disabled={!firstGroup}
            onClick={() => { if (firstGroup) void addFiles(firstGroup.id) }}
        />
    )
}
