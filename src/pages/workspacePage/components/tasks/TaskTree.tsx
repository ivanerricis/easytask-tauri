import type { ReactNode } from "react"
import { TaskTabStopProvider } from "./task-tab-stop"

/**
 * A list of tasks as an ARIA tree: one tab stop (the task that had the focus, else the first). The subtasks of a task belong
 * to the same tree.
 */
export const TaskTree = ({ listKey, label, children }: { listKey: string, label: string, children: ReactNode }) => (
    <TaskTabStopProvider listKey={listKey}>
        <div role="tree" aria-label={label} aria-multiselectable="true" className="flex flex-col w-full">
            {children}
        </div>
    </TaskTabStopProvider>
)