import { Progress } from "@/components/ui/progress"
import { getErrorMessage } from "@/lib/utils"
import type { Section as SectionType, Task } from "@/types/types"
import { ChevronDown } from "lucide-react"
import { ButtonMenuSection } from "./ButtonMenuSection"
import { useEffect, useRef, useState } from "react"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { toast } from "sonner"
import { usePreferences } from "@/contexts/preferences-context"

type SectionHeaderProps = {
    isOpen: boolean
    onOpenChange: (isOpen: boolean) => void
    section: SectionType
}

const calculateCompletionPercentage = (tasks: Task[]): number => {
    const totalTasks = tasks.length
    if (totalTasks === 0) return 100

    const completedTasks = tasks.reduce((acc, task) => {
        const isTaskCompleted = task.completed ||
            (task.subtasks.length > 0 && task.subtasks.every(subtask => subtask.completed))
        return acc + (isTaskCompleted ? 1 : 0)
    }, 0)

    return (completedTasks / totalTasks) * 100
}

export const SectionHeader = ({ isOpen, onOpenChange, section }: SectionHeaderProps) => {
    const [isTextAreaOpen, setTextAreaOpen] = useState(false)
    const [text, setText] = useState(section.title)
    const { getNoteData, renameItem, currentNote } = useWorkspaceData()
    const { showProgressBar } = usePreferences()
    const textareaRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isTextAreaOpen && textareaRef.current) {
            const input = textareaRef.current
            const length = input.value.length
            input.focus()
            input.setSelectionRange(length, length)
        }
    }, [isTextAreaOpen])

    const handleChangeText = async () => {
        try {
            if (section.title !== text && text.trim() !== "") {
                await renameItem("section", section.id, text.trim())
                if (currentNote)
                    await getNoteData(currentNote.id)
            }
        } catch (err) {
            toast.error('Impossibile cambiare il titolo della sezione' + ' - ' + getErrorMessage(err))
        }
        setTextAreaOpen(false)
    }

    const handleOpen = () => {
        onOpenChange(!isOpen)
    }

    const completionPercentage = calculateCompletionPercentage(section.tasks)

    return (
        <div className="relative flex flex-col items-center justify-center">

            {/* Color Container */}
            {/* section.color && <div className="w-full h-1 absolute top-0" style={{ backgroundColor: section.color }}></div>} */}
            
            {section.color && <div
                className="group flex items-center w-full px-1 py-1 whitespace-nowrap rounded-xs"
                style={{ backgroundColor: section.color }}
            >
                {(section.tasks.length > 0) &&
                    <div role="button" onClick={handleOpen} className="shrink-0 cursor-pointer">
                        <ChevronDown className={`${isOpen ? "rotate-0" : "-rotate-90"} ml-1.5 size-5`} />
                    </div>}
                <div className="flex items-center justify-between gap-2 w-full">
                    {!isTextAreaOpen && <h1
                        onClick={() => { setTextAreaOpen(true) }}
                        className="text-sm ml-2">
                        {section.title}
                    </h1>}
                    {isTextAreaOpen && <input
                        ref={textareaRef}
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onBlur={handleChangeText}
                        onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleChangeText();
                            }
                        }}
                        className="w-auto px-1 ml-2 border border-primary resize-none text-sm rounded-xs"
                    />}
                    {showProgressBar && <div className="flex items-center gap-2 shrink-0 min-w-[8rem]">
                        <Progress className="w-20" value={completionPercentage} />
                        <h1 className="text-xs">
                            {Math.round(completionPercentage)} %
                        </h1>
                    </div>}
                    <div className="opacity-0 group-hover:opacity-100">
                        <ButtonMenuSection section={section} />
                    </div>
                </div>
            </div>
            }
        </div>
    )
}
