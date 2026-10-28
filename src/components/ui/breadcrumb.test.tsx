import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbList } from "./breadcrumb"

describe("Breadcrumb", () => {
    it("names the navigation in the app language", () => {
        render(<Breadcrumb><BreadcrumbList><BreadcrumbItem>a</BreadcrumbItem></BreadcrumbList></Breadcrumb>)
        expect(screen.getByRole("navigation", { name: "Percorso di navigazione" })).toBeInTheDocument()
    })

    it("exposes the translated label of the ellipsis to the screen readers", () => {
        const { container } = render(<BreadcrumbEllipsis />)
        expect(screen.getByText("Altro")).toBeInTheDocument()
        expect(container.querySelector("[aria-hidden='true']")).toBe(container.querySelector("svg"))
        expect(container.querySelector("[data-slot='breadcrumb-ellipsis']")).not.toHaveAttribute("aria-hidden")
    })
})
