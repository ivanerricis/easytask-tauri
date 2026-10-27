import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Task as TaskType } from "@/types/types"
import type { TaskDensity } from "@/lib/store/preferences"
import { Task } from "./Task"
import { TASK_DENSITIES } from "./task-density"

vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ updateTaskCompletion: vi.fn(), renameItem: vi.fn() }) }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNoteActions: () => ({ patchTask: vi.fn(() => vi.fn()) }) }))
vi.mock("@/contexts/undo/use-undo", () => ({ useUndoRecorder: () => ({}) }))
vi.mock("@/hooks/use-automations", () => ({ useAutomations: () => ({ dispatch: vi.fn() }) }))
vi.mock("@/contexts/use-color-alpha", () => ({ useColorAlpha: () => ({ taskBackground: false, task: () => 0 }) }))
vi.mock("@/contexts/use-tabs", () => ({ useIsTaskSelected: () => false, useSelectTask: () => vi.fn(), useSubtasksOpen: () => [true, vi.fn()] }))
vi.mock("../rightbar/use-right-panel", () => ({ useShowTaskDetails: () => null }))
vi.mock("../note-dnd-state", () => ({
    useNoteDrag: () => ({ setNodeRef: vi.fn(), dragProps: {}, isDragging: false }),
    useNoteDrop: () => ({ setNodeRef: vi.fn(), zone: null, active: null }),
}))
vi.mock("./ButtonMenuTask", () => ({ ButtonMenuTask: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/components/item-menu", () => ({ ItemMenuButton: () => null }))
vi.mock("@/components/tooltip-custom", () => ({ TooltipCustom: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

const task = { id: 1, sectionID: 1, taskID: null, text: "Task", completed: 0, priority: 0, position: 0, subtasks: [] } as unknown as TaskType

describe("task density", () => {
    beforeEach(() => vi.clearAllMocks())

    it("has distinct spacing and text size per density, normal being the original look", () => {
        expect(TASK_DENSITIES.normal).toMatchObject({ padding: "py-1.5", text: "text-sm", checkbox: "mt-0.5" })
        expect(TASK_DENSITIES.compact.padding).not.toBe(TASK_DENSITIES.normal.padding)
        expect(TASK_DENSITIES.large.padding).not.toBe(TASK_DENSITIES.normal.padding)
        expect(TASK_DENSITIES.compact.text).toBe("text-xs")
        expect(TASK_DENSITIES.large.text).toBe("text-base")
    })

    it.each(["compact", "normal", "large"] as TaskDensity[])("applies the %s classes to the row and its text", density => {
        const { container } = render(<Task task={task} density={density} />)
        const sizes = TASK_DENSITIES[density]
        expect(container.querySelector(`.${CSS.escape(sizes.padding)}`)).toBeInTheDocument()
        expect(screen.getByLabelText("Modifica il testo del task")).toHaveClass(sizes.text)
    })

    it("defaults to the normal look without the prop", () => {
        const { container } = render(<Task task={task} />)
        expect(container.querySelector(`.${CSS.escape("py-1.5")}`)).toBeInTheDocument()
        expect(screen.getByLabelText("Modifica il testo del task")).toHaveClass("text-sm")
    })
})
