import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useInlineEdit } from "./use-inline-edit"

type Props = { value?: string, onCommit: (next: string) => void | Promise<void>, allowEmpty?: boolean }

function Field({ value = "old", onCommit, allowEmpty }: Props) {
    const { editing, error, start, inputProps } = useInlineEdit({ value, onCommit, allowEmpty, errorMessage: e => `err: ${(e as Error).message}` })
    return <div>
        <button onClick={start}>edit</button>
        {editing && <input aria-label="field" {...inputProps} />}
        {error && <span role="alert">{error}</span>}
    </div>
}

const open = () => {
    fireEvent.click(screen.getByText("edit"))
    return screen.getByLabelText("field") as HTMLInputElement
}

describe("useInlineEdit", () => {
    it("focuses the field with the cursor at the end", () => {
        render(<Field onCommit={vi.fn()} />)
        const input = open()
        expect(input).toHaveFocus()
        expect(input.selectionStart).toBe(3)
    })

    it("Enter commits the trimmed text once, even with the blur that follows", async () => {
        const onCommit = vi.fn().mockResolvedValue(undefined)
        render(<Field onCommit={onCommit} />)
        const input = open()
        fireEvent.change(input, { target: { value: "  new  " } })
        await act(async () => { fireEvent.keyDown(input, { key: "Enter" }); fireEvent.blur(input) })
        expect(onCommit).toHaveBeenCalledTimes(1)
        expect(onCommit).toHaveBeenCalledWith("new")
        expect(screen.queryByLabelText("field")).toBeNull()
    })

    it("Escape cancels without committing, stops propagation and ignores the blur", async () => {
        const onCommit = vi.fn()
        const outer = vi.fn()
        render(<div onKeyDown={outer}><Field onCommit={onCommit} /></div>)
        const input = open()
        fireEvent.change(input, { target: { value: "new" } })
        await act(async () => { fireEvent.keyDown(input, { key: "Escape" }); fireEvent.blur(input) })
        expect(onCommit).not.toHaveBeenCalled()
        expect(outer).not.toHaveBeenCalled()
        expect(open().value).toBe("old")
    })

    it("closes without committing when unchanged or empty", async () => {
        const onCommit = vi.fn()
        render(<Field onCommit={onCommit} />)
        let input = open()
        await act(async () => { fireEvent.blur(input) })
        input = open()
        fireEvent.change(input, { target: { value: "  " } })
        await act(async () => { fireEvent.blur(input) })
        expect(onCommit).not.toHaveBeenCalled()
        expect(screen.queryByLabelText("field")).toBeNull()
    })

    it("commits an empty text with allowEmpty", async () => {
        const onCommit = vi.fn()
        render(<Field onCommit={onCommit} allowEmpty />)
        const input = open()
        fireEvent.change(input, { target: { value: "" } })
        await act(async () => { fireEvent.blur(input) })
        expect(onCommit).toHaveBeenCalledWith("")
    })

    it("keeps the field open with the error, and the next blur cancels instead of retrying", async () => {
        const onCommit = vi.fn().mockRejectedValue(new Error("boom"))
        render(<Field onCommit={onCommit} />)
        const input = open()
        fireEvent.change(input, { target: { value: "new" } })
        await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
        expect(screen.getByRole("alert")).toHaveTextContent("err: boom")
        expect(screen.getByLabelText("field")).toBeInTheDocument()
        await act(async () => { fireEvent.blur(screen.getByLabelText("field")) })
        expect(onCommit).toHaveBeenCalledTimes(1)
        expect(screen.queryByLabelText("field")).toBeNull()
        expect(screen.queryByRole("alert")).toBeNull()
    })

    it("can be edited again after a finished edit", async () => {
        const onCommit = vi.fn().mockResolvedValue(undefined)
        render(<Field onCommit={onCommit} />)
        let input = open()
        await act(async () => { fireEvent.keyDown(input, { key: "Escape" }) })
        input = open()
        fireEvent.change(input, { target: { value: "x" } })
        await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
        expect(onCommit).toHaveBeenCalledWith("x")
    })
})
