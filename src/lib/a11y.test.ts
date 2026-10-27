import { describe, expect, it } from "vitest"
import { buttonVariants } from "@/components/ui/button-variants"
import { focusRing } from "./a11y"

describe("focusRing", () => {
    it("uses the same ring width and colour as the Button", () => {
        const button = buttonVariants()
        for (const token of ["focus-visible:ring-[3px]", "focus-visible:ring-ring"]) {
            expect(focusRing).toContain(token)
            expect(button).toContain(token)
        }
    })
})
