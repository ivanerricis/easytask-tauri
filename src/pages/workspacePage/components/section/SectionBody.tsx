import { memo } from "react"
import type { Section } from "@/types/types"
import { AddTask } from "../tasks/AddTask"
import { TaskList } from "../tasks/TaskList"

type SectionBodyProps = {
    isOpen: boolean
    section: Section
}

export const SectionBody = memo(({ isOpen, section }: SectionBodyProps) => (
    <div className={`flex flex-col w-full overflow-hidden dark:bg-secondary bg-background ${isOpen ? 'h-full' : 'hidden'}`}>
        <TaskList tasks={section.tasks} />
        <AddTask sectionId={section.id} />
    </div>
))
