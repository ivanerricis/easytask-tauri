import type { Task } from "@/types/types";
import { getErrorMessage } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import TextareaAutosize from "react-textarea-autosize"
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useWorkspaceData } from "@/contexts/workspace-data-context";
import { toast } from "sonner";

type Props = {
    task: Task
    open: boolean
    onOpenChange: (value: boolean) => void
}

export const DialogTaskDescription = ({ task, open, onOpenChange }: Props) => {
    const [text, setText] = useState(task.description)
    const { updateTaskDescription, getNoteData, currentNote } = useWorkspaceData()

    const handleSaveDecription = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await updateTaskDescription(task.id, text !== "" ? text : undefined)
            if (currentNote)
                await getNoteData(currentNote?.id)
            onOpenChange(false)
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTitle />
            <DialogDescription />
            <DialogContent className="px-10">
                <TextareaAutosize
                    minRows={5}
                    maxRows={10}
                    className="resize-none border rounded-xs py-1 px-2 mt-5"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                >
                </TextareaAutosize>
                <DialogFooter>
                    <Button
                        variant={"outline"}
                        onClick={(e) => handleClose(e)}
                    >
                        Annulla
                    </Button>
                    <Button onClick={(e) => handleSaveDecription(e)}>
                        Salva
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}