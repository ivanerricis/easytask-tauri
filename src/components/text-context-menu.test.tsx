import { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const clipboard = vi.hoisted(() => ({ readText: vi.fn(), writeText: vi.fn() }))
vi.mock("@tauri-apps/plugin-clipboard-manager", () => clipboard)

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

const select = (input: HTMLInputElement, start: number, end: number) => {
    input.focus()
    input.setSelectionRange(start, end)
}

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

    it("does not open in a readonly input", () => {
        setup(<input aria-label="ro" readOnly defaultValue="a" />)
        fireEvent.contextMenu(screen.getByLabelText("ro"))
        expect(screen.queryByRole("menuitem")).toBeNull()
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
