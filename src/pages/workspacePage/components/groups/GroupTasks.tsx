import { memo, useEffect, useRef } from "react"
import i18n from "@/i18n"
import type { Group, Section } from "@/types/types"
import { cn } from "@/lib/utils"
import { reportError } from "@/lib/report-error"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { ensureDBDefaultSection } from "@/db/queries/task"
import { useNoteDndSelector, useNoteDrop } from "../note-dnd-state"
import { AddTask } from "../tasks/AddTask"
import { TaskList } from "../tasks/TaskList"

type DirectTasksProps = {
    section: Section
}

/**
 * The tasks created directly in a group (the ones of its hidden default section) and the "New task" button right under them.
 * The area is a droppable of the default section: a task dropped on it goes at the end, a section dropped on it is a drop on the group.
 */
const DirectTasks = memo(({ section }: DirectTasksProps) => {
    const { setNodeRef, zone } = useNoteDrop("section", section.id)
    const taskDestination = useNoteDndSelector(state => state.active?.kind === "task" && state.hover.targetSectionId === section.id)

    return (
        <div
            ref={setNodeRef}
            data-direct-tasks
            className={cn("flex flex-col gap-1 w-full rounded-xs", (zone || taskDestination) && "ring-2 ring-primary")}
        >
            {/* Without tasks only the button is left: the empty box would just be a double border */}
            {section.tasks.length > 0 &&
                <div className="flex flex-col w-full overflow-hidden border dark:bg-secondary bg-background">
                    <TaskList tasks={section.tasks} />
                </div>}
            <AddTask sectionId={section.id} inGroup />
        </div>
    )
})

type GroupTasksProps = {
    group: Group
}

/**
 * Direct tasks of an open group. Every group has a default section; if one is missing (it should not happen) it is created
 * once and the note is reloaded, so the group is never left without a way to add a task.
 * @category Groups
 */
export const GroupTasks = memo(({ group }: GroupTasksProps) => {
    const { refreshActiveNote } = useActiveNoteActions()
    const repaired = useRef<number | null>(null)
    const missing = !group.defaultSection

    useEffect(() => {
        if (!missing || repaired.current === group.id) return
        repaired.current = group.id
        ensureDBDefaultSection(group.id)
            .then(refreshActiveNote)
            .catch(error => reportError(error, i18n.t("tasks.errors.createTask")))
    }, [missing, group.id, refreshActiveNote])

    return group.defaultSection ? <DirectTasks section={group.defaultSection} /> : null
})
