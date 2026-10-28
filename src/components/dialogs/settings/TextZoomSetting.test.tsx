import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TextZoomSetting } from "./TextZoomSetting"

const setTextZoom = vi.fn()
const state = { textZoom: 1 }

vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ ...state, setTextZoom }) }))

beforeEach(() => {
    vi.clearAllMocks()
    state.textZoom = 1
})

describe("TextZoomSetting", () => {
    it("shows the size of the text in px", () => {
        state.textZoom = 20 / 16
        render(<TextZoomSetting />)
        expect(screen.getByRole("spinbutton", { name: "Dimensione del testo" })).toHaveValue(20)
    })

    it("makes the text 1 px bigger or smaller with the buttons", async () => {
        const user = userEvent.setup()
        render(<TextZoomSetting />)
        await user.click(screen.getByRole("button", { name: "Ingrandisci il testo di 1 px" }))
        expect(setTextZoom).toHaveBeenLastCalledWith(17 / 16)
        await user.click(screen.getByRole("button", { name: "Riduci il testo di 1 px" }))
        expect(setTextZoom).toHaveBeenLastCalledWith(15 / 16)
    })

    it("disables the buttons at the limits", () => {
        state.textZoom = 24 / 16
        const { unmount } = render(<TextZoomSetting />)
        expect(screen.getByRole("button", { name: "Ingrandisci il testo di 1 px" })).toBeDisabled()
        unmount()
        state.textZoom = 12 / 16
        render(<TextZoomSetting />)
        expect(screen.getByRole("button", { name: "Riduci il testo di 1 px" })).toBeDisabled()
    })

    it("applies a typed size only when it is valid", () => {
        render(<TextZoomSetting />)
        const field = screen.getByRole("spinbutton", { name: "Dimensione del testo" })
        fireEvent.change(field, { target: { value: "30" } })
        expect(setTextZoom).not.toHaveBeenCalled()
        fireEvent.change(field, { target: { value: "18" } })
        expect(setTextZoom).toHaveBeenCalledWith(18 / 16)
    })

    it("offers to go back to 16 px only when the size was changed", async () => {
        const user = userEvent.setup()
        const { unmount } = render(<TextZoomSetting />)
        expect(screen.queryByRole("button", { name: "Torna a 16 px" })).not.toBeInTheDocument()
        unmount()
        state.textZoom = 18 / 16
        render(<TextZoomSetting />)
        await user.click(screen.getByRole("button", { name: "Torna a 16 px" }))
        expect(setTextZoom).toHaveBeenCalledWith(1)
    })
})
