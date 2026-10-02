import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
})

const load = async (supported: boolean) => {
    vi.resetModules()
    vi.stubGlobal("CSS", { supports: (property: string, value: string) => supported && property === "field-sizing" && value === "content" })
    return (await import("./auto-textarea")).AutoTextarea
}

describe("AutoTextarea", () => {
    it("lets the browser size it to its text when field-sizing is supported", async () => {
        const AutoTextarea = await load(true)
        render(<AutoTextarea aria-label="testo" value="ciao" onChange={() => { }} className="w-full" />)
        const box = screen.getByLabelText("testo")
        expect(box.className).toContain("[field-sizing:content]")
        expect(box).toHaveAttribute("rows", "1")
        expect(box.className).toContain("w-full")
    })

    it("uses the number of rows as the minimum size", async () => {
        const AutoTextarea = await load(true)
        render(<AutoTextarea aria-label="testo" minRows={3} defaultValue="" />)
        expect(screen.getByLabelText("testo")).toHaveAttribute("rows", "3")
    })

    it("falls back to the measuring textarea when it is not supported", async () => {
        const AutoTextarea = await load(false)
        render(<AutoTextarea aria-label="testo" value="ciao" onChange={() => { }} className="w-full" />)
        const box = screen.getByLabelText("testo")
        expect(box.className).not.toContain("field-sizing")
        expect(box).toHaveValue("ciao")
    })
})
