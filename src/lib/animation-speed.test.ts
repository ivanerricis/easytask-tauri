import { afterEach, describe, expect, it, vi } from "vitest"
import { applyAnimationSpeed, resolveAnimationSpeed } from "./animation-speed"
import { UI_PREFS } from "./store/preferences"

describe("animation speed", () => {
    afterEach(() => { vi.unstubAllGlobals() })

    it("follows the system by default and falls back to it for unknown values", () => {
        expect(UI_PREFS.animationSpeed.default).toBe("system")
        const normalize = UI_PREFS.animationSpeed.normalize!
        expect(normalize("slow")).toBe("slow")
        expect(normalize("none")).toBe("none")
        expect(normalize("normal")).toBe("normal")
        expect(normalize("system")).toBe("system")
        expect(normalize("fast")).toBe("system")
        expect(normalize(undefined)).toBe("system")
    })

    it("resolves the system speed from the reduced motion setting", () => {
        expect(resolveAnimationSpeed("system", true)).toBe("none")
        expect(resolveAnimationSpeed("system", false)).toBe("normal")
        expect(resolveAnimationSpeed("slow", true)).toBe("slow")
    })

    it("sets data-motion on the root element, which the stylesheet reads", () => {
        const root = document.createElement("div")
        applyAnimationSpeed("none", root)
        expect(root.dataset.motion).toBe("none")
        applyAnimationSpeed("slow", root)
        expect(root.dataset.motion).toBe("slow")
    })

    it("with the system speed it follows prefers-reduced-motion, also when it changes, until stopped", () => {
        let listener: () => void = () => { }
        const query = {
            matches: true,
            addEventListener: (_: string, fn: () => void) => { listener = fn },
            removeEventListener: vi.fn(),
        }
        vi.stubGlobal("matchMedia", () => query)
        const root = document.createElement("div")

        const stop = applyAnimationSpeed("system", root)
        expect(root.dataset.motion).toBe("none")
        query.matches = false
        listener()
        expect(root.dataset.motion).toBe("normal")

        expect(typeof stop).toBe("function")
        ;(stop as () => void)()
        expect(query.removeEventListener).toHaveBeenCalled()
    })

    it("uses normal for the system speed where the webview cannot tell", () => {
        vi.stubGlobal("matchMedia", undefined)
        const root = document.createElement("div")
        applyAnimationSpeed("system", root)
        expect(root.dataset.motion).toBe("normal")
    })
})
