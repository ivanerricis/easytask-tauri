import { Button } from "@/components/ui/button"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { CopyMinus } from "lucide-react"
import { useEffect } from "react"

export const ButtonCloseNotes = () => {

    const { currentNotes, setCurrentNotes, setCurrentNote } = useWorkspaceData()

    const closeNotes = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentNotes([])
        setCurrentNote(null)
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setCurrentNotes([])
                setCurrentNote(null)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [])

    return (
        <Button
            variant={"buttonIcon"}
            size={"icon"}
            disabled={currentNotes.length === 0}
            onClick={closeNotes}
        >
            <CopyMinus className="scale-x-[-1]" />
        </Button>
    )
}