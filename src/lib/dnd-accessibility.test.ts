import { afterEach, describe, expect, it } from "vitest"
import type { Active, Over } from "@dnd-kit/core"
import i18n, { applyLanguagePreference } from "@/i18n"
import { buildDndAccessibility } from "./dnd-accessibility"

const entry = (id: string) => ({ id }) as Active & Over
const names: Record<string, string> = { a: "Spesa", b: "Lavoro" }
const describeEntry = (e: { id: string | number }) => names[String(e.id)]

describe("buildDndAccessibility", () => {
    afterEach(async () => { await applyLanguagePreference("it") })

    it("announces the dragged and the target element by name, in Italian", () => {
        const { announcements } = buildDndAccessibility(describeEntry, { keyboard: true })
        expect(announcements.onDragStart?.({ active: entry("a") })).toBe("Hai sollevato Spesa.")
        expect(announcements.onDragOver?.({ active: entry("a"), over: entry("b") } as never)).toBe("Spesa è sopra Lavoro.")
        expect(announcements.onDragOver?.({ active: entry("a"), over: null } as never)).toBe("Spesa non è sopra una destinazione valida.")
        expect(announcements.onDragEnd?.({ active: entry("a"), over: entry("b") } as never)).toBe("Spesa è stato rilasciato su Lavoro.")
        expect(announcements.onDragEnd?.({ active: entry("a"), over: null } as never)).toBe("Spesa è stato rilasciato fuori da una destinazione valida.")
        expect(announcements.onDragCancel?.({ active: entry("a") } as never)).toBe("Spostamento di Spesa annullato.")
    })

    it("follows the language and falls back to a generic name", async () => {
        await applyLanguagePreference("en")
        const { announcements } = buildDndAccessibility(describeEntry, { keyboard: true })
        expect(announcements.onDragStart?.({ active: entry("a") })).toBe("Picked up Spesa.")
        expect(announcements.onDragStart?.({ active: entry("zzz") })).toBe("Picked up item.")
        expect(i18n.language).toBe("en")
    })

    it("uses the keyboard instructions only where a keyboard sensor exists", () => {
        expect(buildDndAccessibility(describeEntry, { keyboard: true }).screenReaderInstructions.draggable).toContain("Spazio")
        expect(buildDndAccessibility(describeEntry, { keyboard: false }).screenReaderInstructions.draggable).toContain("Sposta in")
    })
})
