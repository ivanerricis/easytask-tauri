import { describe, expect, it } from "vitest"
import { applyAnimationSpeed } from "./animation-speed"
import { UI_PREFS } from "./store/preferences"

describe("animation speed", () => {
    it("is normal by default and falls back to it for unknown values", () => {
        expect(UI_PREFS.animationSpeed.default).toBe("normal")
        const normalize = UI_PREFS.animationSpeed.normalize!
        expect(normalize("slow")).toBe("slow")
        expect(normalize("none")).toBe("none")
        expect(normalize("fast")).toBe("normal")
        expect(normalize(undefined)).toBe("normal")
    })

    it("sets data-motion on the root element, which the stylesheet reads", () => {
        const root = document.createElement("div")
        applyAnimationSpeed("none", root)
        expect(root.dataset.motion).toBe("none")
        applyAnimationSpeed("slow", root)
        expect(root.dataset.motion).toBe("slow")
    })
})
