import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FileText } from "lucide-react"
import { ItemRow } from "./item-list-parts"

describe("ItemRow", () => {
    it("scrive i dettagli in text-sm (non più piccoli di 14px)", () => {
        render(<ItemRow icon={FileText} name="Nota" details={["In: Cartella", "Eliminata il 3 marzo"]}><button>Ripristina</button></ItemRow>)
        for (const line of ["In: Cartella", "Eliminata il 3 marzo"]) {
            expect(screen.getByText(line)).toHaveClass("text-sm")
            expect(screen.getByText(line)).not.toHaveClass("text-xs")
        }
    })
})
