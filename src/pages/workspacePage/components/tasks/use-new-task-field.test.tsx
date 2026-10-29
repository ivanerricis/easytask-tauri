import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { deferred } from "@/test/ui-render"
import { NewTaskCheckbox } from "./NewTaskCheckbox"
import { useNewTaskField } from "./use-new-task-field"

const reportError = vi.fn()
let prefs = { keepAddingTasks: false }
vi.mock("@/lib/report-error", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/report-error")>(), reportError: (...args: unknown[]) => reportError(...args) }))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs }))

type Options = Partial<Parameters<typeof useNewTaskField>[0]>
const create = vi.fn()
const onClose = vi.fn()

function Field(options: Options) {
    const { inputProps, onSubmit } = useNewTaskField({ create, onClose, errorFallback: "fallback", ...options })
    return <form onSubmit={onSubmit}><input aria-label="field" {...inputProps} /></form>
}

const input = () => screen.getByLabelText("field") as HTMLInputElement
const type = (value: string) => fireEvent.change(input(), { target: { value } })
const submit = () => fireEvent.submit(input().closest("form")!)

describe("useNewTaskField", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        prefs = { keepAddingTasks: false }
        create.mockResolvedValue(undefined)
    })

    it("gives the input its shared attributes", () => {
        render(<Field />)
        expect(input()).toHaveAttribute("autocomplete", "off")
        expect(input()).toHaveAttribute("aria-description")
        expect(input()).not.toHaveAttribute("readonly")
    })

    it("submits the trimmed text and ignores an empty one", async () => {
        render(<Field />)
        type("   ")
        submit()
        expect(create).not.toHaveBeenCalled()
        type("  hello ")
        submit()
        await waitFor(() => expect(create).toHaveBeenCalledWith("hello", expect.objectContaining({ clear: expect.any(Function), next: expect.any(Function) })))
    })

    it("does not submit when canSubmit is false", () => {
        render(<Field canSubmit={false} />)
        type("x")
        submit()
        expect(create).not.toHaveBeenCalled()
    })

    it("is read-only while saving and ignores a second submit", async () => {
        const pending = deferred()
        create.mockReturnValue(pending.promise)
        render(<Field />)
        type("a")
        submit()
        await waitFor(() => expect(input()).toHaveAttribute("readonly"))
        expect(input()).toHaveAttribute("aria-busy", "true")
        submit()
        expect(create).toHaveBeenCalledTimes(1)
        pending.resolve()
        await waitFor(() => expect(input()).not.toHaveAttribute("readonly"))
    })

    it("next() closes without keepAddingTasks and clears with it", async () => {
        create.mockImplementation(async (_v: string, { next }: { next: () => void }) => { next() })
        const { unmount } = render(<Field />)
        type("a")
        submit()
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
        unmount()

        prefs = { keepAddingTasks: true }
        render(<Field />)
        type("b")
        submit()
        await waitFor(() => expect(input().value).toBe(""))
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(input()).toHaveFocus()
    })

    it("reports a failure with its message or the fallback", async () => {
        create.mockRejectedValueOnce(new Error("boom")).mockRejectedValueOnce(new Error(""))
        render(<Field />)
        type("a")
        submit()
        await waitFor(() => expect(reportError).toHaveBeenCalledWith(expect.any(Error), "boom"))
        type("b")
        submit()
        await waitFor(() => expect(reportError).toHaveBeenLastCalledWith(expect.any(Error), "fallback"))
    })

    it("does not take the focus back when shouldRefocus says no", async () => {
        prefs = { keepAddingTasks: true }
        render(<Field shouldRefocus={() => false} />)
        type("a")
        submit()
        await waitFor(() => expect(create).toHaveBeenCalled())
        await waitFor(() => expect(input()).not.toHaveAttribute("readonly"))
        expect(input()).not.toHaveFocus()
    })

    it("Escape closes (stopping the event on request)", () => {
        const parent = vi.fn()
        render(<div onKeyDown={parent}><Field stopEscape /></div>)
        fireEvent.keyDown(input(), { key: "Escape" })
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(parent).not.toHaveBeenCalled()
    })

    it("Escape lets the event through without stopEscape", () => {
        const parent = vi.fn()
        render(<div onKeyDown={parent}><Field /></div>)
        fireEvent.keyDown(input(), { key: "Escape" })
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(parent).toHaveBeenCalled()
    })

    it("Enter on the empty field closes only with keepAddingTasks, and never while composing", () => {
        render(<Field />)
        fireEvent.keyDown(input(), { key: "Enter" })
        expect(onClose).not.toHaveBeenCalled()
    })

    it("closes on Enter when empty with keepAddingTasks, not when composing or typed", () => {
        prefs = { keepAddingTasks: true }
        render(<Field />)
        fireEvent.keyDown(input(), { key: "Enter", isComposing: true })
        expect(onClose).not.toHaveBeenCalled()
        type("x")
        fireEvent.keyDown(input(), { key: "Enter" })
        expect(onClose).not.toHaveBeenCalled()
        type("")
        fireEvent.keyDown(input(), { key: "Enter" })
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("blur closes only when empty, and not at all with closeOnBlur false", () => {
        const { unmount } = render(<Field />)
        type("x")
        fireEvent.blur(input())
        expect(onClose).not.toHaveBeenCalled()
        type("")
        fireEvent.blur(input())
        expect(onClose).toHaveBeenCalledTimes(1)
        unmount()

        render(<Field closeOnBlur={false} />)
        fireEvent.blur(input())
        expect(onClose).toHaveBeenCalledTimes(1)
    })
})

describe("NewTaskCheckbox", () => {
    it("is an inert, hidden placeholder that takes the given classes", () => {
        const { container } = render(<NewTaskCheckbox className="mt-1" />)
        const span = container.firstElementChild!
        expect(span).toHaveAttribute("aria-hidden", "true")
        expect(span).toHaveClass("mt-1", "border-input")
    })
})
