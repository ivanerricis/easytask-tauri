import { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

const clipboard = vi.hoisted(() => ({ readText: vi.fn(), writeText: vi.fn() }))
vi.mock("@tauri-apps/plugin-clipboard-manager", () => clipboard)
vi.mock("sonner", async () => (await import("@/test/mocks")).sonnerMock())
import { TextContextMenu } from "./text-context-menu"

function Controlled() {
    const [value, setValue] = useState("hello world")
    return (
        <>
            <input aria-label="field" value={value} onChange={(e) => setValue(e.target.value)} />
            <output data-testid="state">{value}</output>
        </>
    )
}

const setup = (ui: React.ReactNode = <Controlled />) => render(<>{ui}<TextContextMenu /></>)

const select = (input: HTMLInputElement | HTMLTextAreaElement, start: number, end: number) => {
    input.focus()
    input.setSelectionRange(start, end)
}

afterEach(() => {
    // jsdom has no execCommand: the tests that need it define it on the document
    delete (document as { execCommand?: unknown }).execCommand
})

beforeEach(() => {
    clipboard.readText.mockReset().mockResolvedValue("")
    clipboard.writeText.mockReset().mockResolvedValue(undefined)
})

describe("TextContextMenu", () => {
    it("opens on right click in an input", async () => {
        setup()
        fireEvent.contextMenu(screen.getByLabelText("field"))
        expect(await screen.findByRole("menuitem", { name: /Taglia/ })).toBeInTheDocument()
        expect(screen.getByRole("menuitem", { name: /Seleziona tutto/ })).toBeInTheDocument()
    })

    it("does not open on a div", () => {
        setup(<div data-testid="box">x</div>)
        fireEvent.contextMenu(screen.getByTestId("box"))
        expect(screen.queryByRole("menuitem")).toBeNull()
    })

    it("opens a menu with only Copy and Select all in a read only field", async () => {
        setup(<input aria-label="ro" readOnly defaultValue="abc" />)
        fireEvent.contextMenu(screen.getByLabelText("ro"))
        expect(await screen.findByRole("menuitem", { name: /Copia/ })).toBeInTheDocument()
        expect(screen.getByRole("menuitem", { name: /Seleziona tutto/ })).toBeInTheDocument()
        for (const hidden of [/Taglia/, /Incolla/, /Annulla/, /Ripeti/]) expect(screen.queryByRole("menuitem", { name: hidden })).toBeNull()
    })

    it("opens on number and email inputs without throwing on the selection", async () => {
        setup(<input aria-label="n" type="number" defaultValue="12" />)
        fireEvent.contextMenu(screen.getByLabelText("n"))
        fireEvent.click(await screen.findByRole("menuitem", { name: /Seleziona tutto/ }))
        expect(await screen.findByRole("menuitem", { name: /Taglia/, hidden: true }).catch(() => null)).toBeNull()
    })

    it("leaves a read only text inside an element with its own menu to that menu", () => {
        setup(<div data-contextmenu><textarea aria-label="task" readOnly defaultValue="t" /></div>)
        fireEvent.contextMenu(screen.getByLabelText("task"))
        expect(screen.queryByRole("menuitem")).toBeNull()
    })

    it("keeps the text menu for a writable field inside an element with its own menu", async () => {
        setup(<div data-contextmenu><input aria-label="rename" defaultValue="nome" /></div>)
        fireEvent.contextMenu(screen.getByLabelText("rename"))
        expect(await screen.findByRole("menuitem", { name: /Seleziona tutto/ })).toBeInTheDocument()
    })

    it("opens on a textarea", async () => {
        setup(<textarea aria-label="area" defaultValue="one two" />)
        const area = screen.getByLabelText("area") as HTMLTextAreaElement
        select(area, 0, 3)
        fireEvent.contextMenu(area)
        fireEvent.click(await screen.findByRole("menuitem", { name: /Copia/ }))
        await waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith("one"))
    })

    it("places the anchor at the pointer before the menu opens", async () => {
        setup()
        fireEvent.contextMenu(screen.getByLabelText("field"), { clientX: 120, clientY: 80 })
        // Not open yet in the render that moves the anchor
        expect(screen.queryByRole("menuitem")).toBeNull()
        await screen.findByRole("menuitem", { name: /Taglia/ })
        const anchor = document.querySelector("span[aria-hidden].fixed") as HTMLElement
        expect(anchor.style.left).toBe("120px")
        expect(anchor.style.top).toBe("80px")
    })

    it("Escape closes the menu and gives the focus back to the field", async () => {
        setup()
        const input = screen.getByLabelText("field") as HTMLInputElement
        select(input, 1, 3)
        fireEvent.contextMenu(input)
        await screen.findByRole("menuitem", { name: /Taglia/ })
        fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
        await waitFor(() => expect(screen.queryByRole("menuitem")).toBeNull())
        await waitFor(() => expect(document.activeElement).toBe(input))
        expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3])
    })

    it("has Undo and Redo, which run the native commands", async () => {
        const execCommand = vi.fn().mockReturnValue(true)
        ;(document as unknown as { execCommand: unknown }).execCommand = execCommand
        setup()
        fireEvent.contextMenu(screen.getByLabelText("field"))
        const undo = await screen.findByRole("menuitem", { name: /Annulla/ })
        expect(undo).toHaveTextContent("Ctrl+Z")
        expect(screen.getByRole("menuitem", { name: /Ripeti/ })).toHaveTextContent("Ctrl+Y")
        fireEvent.click(undo)
        await waitFor(() => expect(execCommand).toHaveBeenCalledWith("undo", false, undefined))
    })

    it("cuts and pastes through execCommand so the native undo keeps working", async () => {
        const execCommand = vi.fn().mockReturnValue(true)
        ;(document as unknown as { execCommand: unknown }).execCommand = execCommand
        clipboard.readText.mockResolvedValue("XY")
        setup()
        const input = screen.getByLabelText("field") as HTMLInputElement
        select(input, 0, 5)
        fireEvent.contextMenu(input)
        fireEvent.click(await screen.findByRole("menuitem", { name: /Taglia/ }))
        await waitFor(() => expect(execCommand).toHaveBeenCalledWith("delete", false, undefined))
        fireEvent.contextMenu(input)
        fireEvent.click(await screen.findByRole("menuitem", { name: /Incolla/ }))
        await waitFor(() => expect(execCommand).toHaveBeenCalledWith("insertText", false, "XY"))
    })

    it("keeps Paste enabled while the clipboard is read and shows a toast when the read fails", async () => {
        clipboard.readText.mockRejectedValue(new Error("denied"))
        setup()
        fireEvent.contextMenu(screen.getByLabelText("field"))
        const paste = await screen.findByRole("menuitem", { name: /Incolla/ })
        expect(paste).not.toHaveAttribute("aria-disabled", "true")
        fireEvent.click(paste)
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Impossibile leggere gli appunti"))
    })

    it("disables cut, copy and paste without selection or clipboard", async () => {
        setup()
        const input = screen.getByLabelText("field") as HTMLInputElement
        select(input, 3, 3)
        fireEvent.contextMenu(input)
        const cut = await screen.findByRole("menuitem", { name: /Taglia/ })
        expect(cut).toHaveAttribute("aria-disabled", "true")
        expect(screen.getByRole("menuitem", { name: /Copia/ })).toHaveAttribute("aria-disabled", "true")
        expect(screen.getByRole("menuitem", { name: /Incolla/ })).toHaveAttribute("aria-disabled", "true")
    })

    it("copies the selection", async () => {
        setup()
        const input = screen.getByLabelText("field") as HTMLInputElement
        select(input, 0, 5)
        fireEvent.contextMenu(input)
        fireEvent.click(await screen.findByRole("menuitem", { name: /Copia/ }))
        await waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith("hello"))
    })

    it("cuts the selection", async () => {
        setup()
        const input = screen.getByLabelText("field") as HTMLInputElement
        select(input, 0, 6)
        fireEvent.contextMenu(input)
        fireEvent.click(await screen.findByRole("menuitem", { name: /Taglia/ }))
        await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("world"))
        expect(clipboard.writeText).toHaveBeenCalledWith("hello ")
    })

    it("pastes into a controlled input", async () => {
        clipboard.readText.mockResolvedValue("XY")
        setup()
        const input = screen.getByLabelText("field") as HTMLInputElement
        select(input, 0, 5)
        fireEvent.contextMenu(input)
        const paste = await screen.findByRole("menuitem", { name: /Incolla/ })
        await waitFor(() => expect(paste).not.toHaveAttribute("aria-disabled", "true"))
        fireEvent.click(paste)
        await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("XY world"))
    })

    it("selects all", async () => {
        setup()
        const input = screen.getByLabelText("field") as HTMLInputElement
        select(input, 2, 2)
        fireEvent.contextMenu(input)
        fireEvent.click(await screen.findByRole("menuitem", { name: /Seleziona tutto/ }))
        await waitFor(() => {
            expect(input.selectionStart).toBe(0)
            expect(input.selectionEnd).toBe(input.value.length)
        })
    })
})
