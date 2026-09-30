import { useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { DialogTrash } from "@/components/dialogs/dialog-trash"
import { ItemFooter } from "../items/ItemFooter"

export const ButtonTrash = () => {
    const { currentWorkspace } = useWorkspace()
    const { workspaceDataTree, getTrash } = useWorkspaceData()
    const [isOpen, setIsOpen] = useState(false)
    const [count, setCount] = useState(0)
    const workspaceID = currentWorkspace?.id

    // Re-query the trash size when the tree changes (delete/restore) or the dialog closes
    useEffect(() => {
        if (workspaceID === undefined) return
        let cancelled = false
        getTrash(workspaceID)
            .then(items => { if (!cancelled) setCount(items.length) })
            .catch(console.error)
        return () => { cancelled = true }
    }, [workspaceID, workspaceDataTree, isOpen, getTrash])

    return (
        <>
            <ItemFooter type="trash" text="Cestino" badge={count} onClick={() => setIsOpen(true)} />
            <DialogTrash isOpen={isOpen} onOpenChange={setIsOpen} />
        </>
    )
}
