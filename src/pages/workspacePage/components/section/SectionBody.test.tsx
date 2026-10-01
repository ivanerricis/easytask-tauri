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

    it("hides the completed tasks with their whole subtree and the completed subtasks of the open ones", () => {
        prefs.hideCompletedTasks = true
        render(<SectionBody isOpen section={section} />)
        expect(screen.getByText("Aperto")).toBeInTheDocument()
        expect(screen.getByText("Padre")).toBeInTheDocument()
        expect(screen.getByText("Figlio aperto")).toBeInTheDocument()
        for (const text of ["Fatto", "Sub aperto", "Sub fatto", "Figlio fatto"]) expect(screen.queryByText(text)).not.toBeInTheDocument()
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
        // Fatto + Sub fatto + Figlio fatto
        expect(screen.getByTestId("hidden-completed")).toHaveTextContent("3 task completati nascosti")
    })

    it("uses the singular for one hidden task and shows nothing when none is hidden", () => {
        prefs.hideCompletedTasks = true
        const { rerender } = render(<SectionBody isOpen section={makeSection({ id: 2, tasks: [makeTask({ id: 1, completed: true }), makeTask({ id: 2 })] })} />)
        expect(screen.getByTestId("hidden-completed")).toHaveTextContent("1 task completato nascosto")
        rerender(<SectionBody isOpen section={makeSection({ id: 2, tasks: [makeTask({ id: 2 })] })} />)
        expect(screen.queryByTestId("hidden-completed")).not.toBeInTheDocument()
    })
})
