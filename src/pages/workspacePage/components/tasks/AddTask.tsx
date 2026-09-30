import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { getErrorMessage } from "@/lib/utils"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { PlusButton } from "../section/PlusButton"
import { CloseButton } from "../section/CloseButton"

type AddTaskProps = {
    /** Section of the new task; ignored for subtasks, which inherit the section of their parent. */
    sectionId: number | null
    /** When set, the input creates a subtask of this task and starts open (no "+" placeholder). */
    parentTaskId?: number
    /** Called when the input is dismissed (only meaningful with parentTaskId). */
    onClose?: () => void
}

export const AddTask = ({ sectionId, parentTaskId, onClose }: AddTaskProps) => {
    const isSubtask = parentTaskId !== undefined
    const [isOpen, setOpen] = useState(isSubtask)
    const [text, setText] = useState("")
    const { createTask, createSubTask, currentNote, getNoteData } = useWorkspaceData()
    const formRef = useRef<HTMLFormElement>(null)
    const onCloseRef = useRef(onClose)

    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                setOpen(false)
                setText("")
                onCloseRef.current?.()
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleOpen = () => {
        if (isOpen) onClose?.()
        setOpen(prev => !prev)
        setText("")
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (text.trim()) {
            try {
                if (isSubtask) {
                    // Keep the input open (and focused) to add the next subtask
                    await createSubTask(parentTaskId, text.trim())
                    setText("")
                } else if (sectionId !== null) {
                    await createTask(sectionId, text.trim())
                    handleOpen()
                }
                if (!currentNote) return
                await getNoteData(currentNote.id)
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || `Errore nella creazione del ${isSubtask ? "sottotask" : "task"}`)
            }
        }
    }

    return (
        !isOpen ? (
            <div
                role="button"
                onClick={handleOpen}
                className="cursor-pointer group/add flex items-center justify-center w-full h-9"
            >
                <Plus className="group-hover/add:text-foreground text-muted-foreground size-5" />
            </div>
        ) : (
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex flex-col items-center justify-center w-full"
            >
                <div className="flex items-center justify-center w-full bg-background">
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={isSubtask ? "Scrivi un sottotask..." : "Scrivi qualcosa..."}
                        autoFocus
                        onKeyDown={(e) => { if (isSubtask && e.key === "Escape") handleOpen() }}
                        onBlur={() => { if (isSubtask && !text.trim()) handleOpen() }}
                        className="rounded-none border-none text-sm"
                    />
                </div>
                <div className="flex items-center w-full border-t divide-x">
                    <PlusButton disabled={!text.trim()} />
                    <CloseButton onClick={handleOpen} />
                </div>
            </form>
        )
    )
}
