import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Palette, Plus, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"

type AddTaskProps = {
    sectionId: number
}

const defaultTask = {
    text: "",
    color: "#FFFFFF"
}

export const AddTask = ({ sectionId }: AddTaskProps) => {
    const [isOpen, setOpen] = useState(false)
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const [task, setTask] = useState(defaultTask)
    const { createTask, currentNote, getNoteData } = useWorkspaceData()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                handleOpen()
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleOpen = () => {
        setOpen(prev => !prev)
        setTask(defaultTask)
        setPaletteOpen(false)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (task.text.trim()) {
            await createTask(sectionId, task.text.trim(), paletteIsOpen ? task.color : undefined);
            handleOpen()
            if (!currentNote) return
            await getNoteData(currentNote.id)
        }
    }

    return (
        !isOpen ? (
            <div
                role="button"
                onClick={handleOpen}
                className="cursor-pointer group/add flex items-center justify-center w-full h-10"
            >
                <Plus size={20} className="group-hover/add:text-foreground text-muted-foreground" />
            </div>
        ) : (
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex flex-col items-center justify-center w-full"
            >
                <div className="flex items-center justify-center w-full">
                    <Input
                        value={task.text}
                        onChange={(e) => setTask({ ...task, text: e.target.value })}
                        placeholder="Scrivi qualcosa..."
                        autoFocus
                        className="rounded-none border-none"
                    />
                </div>
                {!paletteIsOpen
                    ? <div
                        role="button"
                        onClick={() => { setPaletteOpen(true) }}
                        className="group/color cursor-pointer flex items-center justify-center w-full h-8"
                    >
                        <Palette size={20} className="group-hover/color:text-foreground text-muted-foreground" />
                    </div>
                    : <div className="flex items-center justify-center w-full">
                        <div
                            className="flex items-center justify-center h-8 w-full"
                            style={{ backgroundColor: task.color }}
                        >
                            <Input
                                id="color-1"
                                name="color"
                                type="color"
                                className="opacity-0 cursor-pointer"
                                value={task.color}
                                onChange={e => setTask({
                                    ...task,
                                    color: e.target.value
                                })}
                            />
                        </div>
                        <div
                            role="button"
                            onClick={(e) => { e.preventDefault(); setPaletteOpen(false); setTask({ ...task, color: "#FFFFFF" }); }}
                            className="group/close cursor-pointer flex items-center justify-center w-full h-8"
                        >
                            <X size={20} className="group-hover:text-foreground group-hover/close:text-foreground text-muted-foreground" />
                        </div>
                    </div>}
                <div className="flex items-center w-full border-t">
                    <div
                        role="button"
                        onClick={handleSubmit}
                        className="group/add cursor-pointer flex items-center justify-center w-full h-8 border-r"
                    >
                        <Plus size={20} className="group-hover:text-foreground group-hover/add:text-foreground text-muted-foreground" />
                    </div>
                    <div
                        role="button"
                        onClick={handleOpen}
                        className="group/close cursor-pointer flex items-center justify-center w-full h-8"
                    >
                        <X size={20} className="group-hover:text-foreground group-hover/close:text-foreground text-muted-foreground" />
                    </div>
                </div>
            </form>
        )
    )
}