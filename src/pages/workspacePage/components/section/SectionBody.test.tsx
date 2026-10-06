import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SectionBody } from "./SectionBody"
import { makeSection, makeTask } from "@/test/ui-fixtures"

const prefs = { hideCompletedTasks: false }
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs }))
vi.mock("../tasks/AddTask", () => ({ AddTask: () => <div>add task</div> }))
// Shows the task and, nested, its children (what the real Task does with its subtasks)
vi.mock("../tasks/Task", () => ({
    Task: ({ task, children }: { task: { text: string, subtasks: unknown[] }, children?: ReactNode }) => (
        <div data-testid="task" data-subtasks={task.subtasks.length}>{task.text}<div>{children}</div></div>
    ),
}))

const section = makeSection({
    id: 1,
    tasks: [
        makeTask({ id: 1, text: "Aperto" }),
        makeTask({
            id: 2, text: "Fatto", completed: true,
            subtasks: [makeTask({ id: 21, text: "Sub aperto" }), makeTask({ id: 22, text: "Sub fatto", completed: true })],
        }),
        makeTask({ id: 3, text: "Padre", subtasks: [makeTask({ id: 31, text: "Figlio fatto", completed: true }), makeTask({ id: 32, text: "Figlio aperto" })] }),
    ],
})

describe("SectionBody hiding the completed tasks", () => {
    beforeEach(() => { prefs.hideCompletedTasks = false })

    it("shows every task and no counter when the preference is off", () => {
        render(<SectionBody isOpen section={section} />)
        for (const text of ["Aperto", "Fatto", "Sub aperto", "Sub fatto", "Padre", "Figlio fatto", "Figlio aperto"]) expect(screen.getByText(text)).toBeInTheDocument()
        expect(screen.queryByTestId("hidden-completed")).not.toBeInTheDocument()
    })

    it("hides fully completed subtrees, keeps a completed task with open work below it, and hides the completed subtasks of the open ones", () => {
        prefs.hideCompletedTasks = true
        render(<SectionBody isOpen section={section} />)
        expect(screen.getByText("Aperto")).toBeInTheDocument()
        expect(screen.getByText("Padre")).toBeInTheDocument()
        expect(screen.getByText("Figlio aperto")).toBeInTheDocument()
        // "Fatto" is completed but "Sub aperto" is open: it stays, and its own completed subtask goes
        expect(screen.getByText("Fatto")).toBeInTheDocument()
        expect(screen.getByText("Sub aperto")).toBeInTheDocument()
        for (const text of ["Sub fatto", "Figlio fatto"]) expect(screen.queryByText(text)).not.toBeInTheDocument()
    })

    it("still hands the full task to the Task (its progress counts the hidden subtasks)", () => {
        prefs.hideCompletedTasks = true
        render(<SectionBody isOpen section={section} />)
        const parent = screen.getAllByTestId("task").find(node => node.textContent?.startsWith("Padre"))
        expect(parent).toHaveAttribute("data-subtasks", "2")
    })

    it("tells how many completed tasks are hidden (plural)", () => {
        prefs.hideCompletedTasks = true
        render(<SectionBody isOpen section={section} />)
        // Sub fatto + Figlio fatto (Fatto stays visible)
        expect(screen.getByTestId("hidden-completed")).toHaveTextContent("2 task completati nascosti")
    })

    it("hides a completed task together with its completed subtasks and counts them all", () => {
        prefs.hideCompletedTasks = true
        const tree = makeSection({ id: 3, tasks: [makeTask({ id: 1, text: "Chiuso", completed: true, subtasks: [makeTask({ id: 11, text: "Chiuso figlio", completed: true })] })] })
        render(<SectionBody isOpen section={tree} />)
        expect(screen.queryByText("Chiuso")).not.toBeInTheDocument()
        expect(screen.queryByText("Chiuso figlio")).not.toBeInTheDocument()
        expect(screen.getByTestId("hidden-completed")).toHaveTextContent("2 task completati nascosti")
    })

    it("uses the singular for one hidden task and shows nothing when none is hidden", () => {
        prefs.hideCompletedTasks = true
        const { rerender } = render(<SectionBody isOpen section={makeSection({ id: 2, tasks: [makeTask({ id: 1, completed: true }), makeTask({ id: 2 })] })} />)
        expect(screen.getByTestId("hidden-completed")).toHaveTextContent("1 task completato nascosto")
        rerender(<SectionBody isOpen section={makeSection({ id: 2, tasks: [makeTask({ id: 2 })] })} />)
        expect(screen.queryByTestId("hidden-completed")).not.toBeInTheDocument()
    })
})
