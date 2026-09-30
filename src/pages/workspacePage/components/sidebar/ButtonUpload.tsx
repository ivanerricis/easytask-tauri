import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { useActiveNote } from "@/contexts/use-active-note"
import { useAudio } from "@/contexts/use-audio"
import { Music } from "lucide-react"

/**
 * Adds audio files to the first group of the open note (each group also has its own "Aggiungi file audio" menu item).
 * @category Sidebar
 */
export const ButtonUpload = () => {
    const { noteDataTree } = useActiveNote()
    const { addFiles } = useAudio()
    const firstGroup = noteDataTree?.groups[0]

    return (
        <TooltipCustom text="Aggiungi file audio al primo gruppo della nota">
            <Button
                variant={"buttonIcon"}
                size={"icon"}
                disabled={!firstGroup}
                aria-label="Aggiungi file audio"
                onClick={() => { if (firstGroup) void addFiles(firstGroup.id) }}
            >
                <Music />
            </Button>
        </TooltipCustom>
    )
}
