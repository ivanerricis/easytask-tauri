import type { Section } from "@/types/types"
import { AddTask } from "../tasks/AddTask"
import { Task } from "../tasks/Task"

type SectionBodyProps = {
    isOpen: boolean
    section: Section
}

export const SectionBody = ({ isOpen, section }: SectionBodyProps) => {
    return (
        <div
            className={`flex flex-col w-full border-t overflow-hidden bg-secondary ${isOpen ? 'h-full opacity-100' : 'max-h-0 opacity-0'}`}
        >
            {section.tasks.map((task) => (
                <Task key={task.id} task={task}></Task>
            ))}
            <AddTask sectionId={section.id} />
        </div>
    )
}