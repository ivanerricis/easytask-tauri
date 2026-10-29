import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SideBarContainer } from "./SideBarContainer"

describe("SideBarContainer", () => {
    it("does not put the literal class 'undefined' when no className is given", () => {
        const { container } = render(<SideBarContainer>x</SideBarContainer>)
        expect(container.firstElementChild!.classList).not.toContain("undefined")
        expect(container.firstElementChild).toHaveClass("bg-secondary")
    })

    it("adds the given className", () => {
        const { container } = render(<SideBarContainer className="extra">x</SideBarContainer>)
        expect(container.firstElementChild).toHaveClass("extra", "bg-secondary")
    })
})
