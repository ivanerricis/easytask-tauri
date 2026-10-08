import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MIN_WIDTH } from "@/lib/sidebar-layout"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { saveShortcutOverrides } from "@/lib/store/shortcuts"
import { SideBar } from "./SideBar"

const originalWidth = window.innerWidth

// Radix tooltips measure their arrow with a ResizeObserver, which jsdom lacks
vi.stubGlobal("ResizeObserver", class { observe() { } unobserve() { } disconnect() { } })

type HostProps = { initialOpen?: boolean, overlay?: boolean, onWidthChange?: (w: number) => void, width?: number }

const Host = ({ initialOpen = true, overlay = false, onWidthChange, width = SIDEBAR_DEFAULT_WIDTH }: HostProps) => {
    const [open, setOpen] = useState(initialOpen)
    const [w, setW] = useState(width)
    return (
        <SideBar
            open={open}
            onOpenChange={setOpen}
            width={w}
            onWidthChange={value => { setW(value); onWidthChange?.(value) }}
            overlay={overlay}
        >
            <button>dentro</button>
        </SideBar>
    )
}

const separator = () => screen.getByRole("separator")

describe("SideBar", () => {
    afterEach(() => { window.innerWidth = originalWidth })

    it("exposes a focusable vertical separator with the width as value", () => {
        window.innerWidth = 1400
        render(<Host />)
        const handle = separator()
        expect(handle).toHaveAttribute("aria-orientation", "vertical")
        expect(handle).toHaveAttribute("aria-label", "Ridimensiona la barra laterale")
        expect(handle).toHaveAttribute("aria-valuemin", String(SIDEBAR_MIN_WIDTH))
        expect(handle).toHaveAttribute("aria-valuenow", String(SIDEBAR_DEFAULT_WIDTH))
        expect(handle).toHaveAttribute("aria-valuetext", `${SIDEBAR_DEFAULT_WIDTH} pixel`)
        expect(handle).toHaveAttribute("tabindex", "0")
    })

    it("resizes with the arrow keys, Home and End, and resets with a double click", async () => {
        window.innerWidth = 1400
        const onWidthChange = vi.fn()
        render(<Host onWidthChange={onWidthChange} />)
        const handle = separator()
        handle.focus()
        expect(handle).toHaveFocus()

        await userEvent.keyboard("{ArrowRight}")
        expect(onWidthChange).toHaveBeenLastCalledWith(SIDEBAR_DEFAULT_WIDTH + 16)
        expect(separator()).toHaveAttribute("aria-valuenow", String(SIDEBAR_DEFAULT_WIDTH + 16))

        await userEvent.keyboard("{Shift>}{ArrowLeft}{/Shift}")
        expect(onWidthChange).toHaveBeenLastCalledWith(Math.max(SIDEBAR_MIN_WIDTH, SIDEBAR_DEFAULT_WIDTH + 16 - 64))

        await userEvent.keyboard("{Home}")
        expect(onWidthChange).toHaveBeenLastCalledWith(SIDEBAR_MIN_WIDTH)
        await userEvent.keyboard("{ArrowLeft}")
        expect(separator()).toHaveAttribute("aria-valuenow", String(SIDEBAR_MIN_WIDTH))

        await userEvent.keyboard("{End}")
        expect(separator()).toHaveAttribute("aria-valuenow", "480")

        fireEvent.doubleClick(separator())
        expect(separator()).toHaveAttribute("aria-valuenow", String(SIDEBAR_DEFAULT_WIDTH))
    })

    it("resizes by dragging and commits the width on release", () => {
        window.innerWidth = 1400
        const onWidthChange = vi.fn()
        render(<Host onWidthChange={onWidthChange} />)
        vi.spyOn(screen.getByTestId("sidebar-panel"), "getBoundingClientRect").mockReturnValue({ left: 44, right: 304, top: 0, bottom: 0, width: 260, height: 0, x: 44, y: 0, toJSON: () => ({}) })

        fireEvent.mouseDown(separator())
        fireEvent.mouseMove(window, { clientX: 344 })
        expect(separator()).toHaveAttribute("aria-valuenow", "300")
        expect(onWidthChange).not.toHaveBeenCalled()

        fireEvent.mouseMove(window, { clientX: 5000 })
        expect(separator()).toHaveAttribute("aria-valuenow", "480")

        fireEvent.mouseUp(window)
        expect(onWidthChange).toHaveBeenCalledExactlyOnceWith(480)
    })

    it("lays the content out at the full width of the panel, so it does not reflow while the panel opens", () => {
        render(<Host width={300} />)
        expect(screen.getByText("dentro").parentElement).toHaveStyle({ width: "300px" })
    })

    it("collapses and expands with the toggle button, which reports its state", async () => {
        window.innerWidth = 1400
        render(<Host />)
        const toggle = screen.getByRole("button", { name: "Mostra o nascondi la barra laterale" })
        expect(toggle).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByText("dentro")).toBeInTheDocument()

        await userEvent.click(toggle)
        expect(toggle).toHaveAttribute("aria-expanded", "false")
        expect(screen.queryByText("dentro")).toBeNull()
        expect(screen.queryByRole("separator")).toBeNull()
    })

    it("shows the customized shortcut in the toggle tooltip", async () => {
        window.innerWidth = 1400
        await saveShortcutOverrides({ "toggle-sidebar": { key: "j", ctrl: true } })
        render(<ShortcutsProvider><Host /></ShortcutsProvider>)
        await userEvent.hover(screen.getByRole("button", { name: "Mostra o nascondi la barra laterale" }))
        expect((await screen.findAllByText("(Ctrl + J)")).length).toBeGreaterThan(0)
    })

    it("in overlay mode is a modal sheet without resizer that closes with Esc or a click outside", async () => {
        window.innerWidth = 800
        render(<Host overlay />)
        expect(screen.getByRole("dialog", { name: "Mostra o nascondi la barra laterale" })).toBeInTheDocument()
        expect(screen.getByText("dentro")).toBeInTheDocument()
        expect(screen.queryByRole("separator")).toBeNull()

        // Focus is trapped in the sheet while it is open
        await userEvent.tab()
        expect(screen.getByText("dentro")).toHaveFocus()

        const toggle = () => screen.getByRole("button", { name: "Mostra o nascondi la barra laterale", hidden: true })
        await userEvent.keyboard("{Escape}")
        expect(screen.queryByText("dentro")).toBeNull()
        expect(toggle()).toHaveFocus()

        await userEvent.click(toggle())
        expect(screen.getByText("dentro")).toBeInTheDocument()
        await userEvent.click(document.querySelector("[data-slot='sheet-overlay']")!)
        expect(screen.queryByText("dentro")).toBeNull()
    })
})
