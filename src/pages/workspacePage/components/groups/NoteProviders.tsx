import type { ReactElement } from "react"
import { NoteDndProvider } from "../NoteDndProvider"
import { TaskSelectionProvider } from "../tasks/task-selection-context"
import { TaskInsertProvider } from "../tasks/task-insert-state"
import { TaskSelectionActionsProvider } from "../tasks/task-selection-actions"
import { NoteBackgroundMenu } from "./NoteBackgroundMenu"

/**
 * The state shared by everything drawn in an open note: the task multi-selection, drag & drop, the "+" insert line, the
 * actions on the selection (they need the selection provider outside) and the menu of the note background.
 */
export function NoteProviders({ children }: { children: ReactElement }) {
    return (
        <TaskSelectionProvider>
            <NoteDndProvider>
                <TaskInsertProvider>
                    <TaskSelectionActionsProvider>
                        <NoteBackgroundMenu>{children}</NoteBackgroundMenu>
                    </TaskSelectionActionsProvider>
                </TaskInsertProvider>
            </NoteDndProvider>
        </TaskSelectionProvider>
    )
}
