import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FileText } from "lucide-react"
import { ItemRow, ListSkeleton } from "./item-list-parts"

describe("ItemRow", () => {
    it("scrive i dettagli in text-sm (non più piccoli di 14px)", () => {
        render(<ItemRow icon={FileText} name="Nota" details={["In: Cartella", "Eliminata il 3 marzo"]}><button>Ripristina</button></ItemRow>)
        for (const line of ["In: Cartella", "Eliminata il 3 marzo"]) {
            expect(screen.getByText(line)).toHaveClass("text-sm")
            expect(screen.getByText(line)).not.toHaveClass("text-xs")
        }
    })
})

describe("ListSkeleton", () => {
    it("è occupato, mostra Caricamento… e non anima con movimento ridotto", async () => {
        render(<ListSkeleton />)
        const status = screen.getByRole("status")
        expect(status).toHaveAttribute("aria-busy", "true")
        expect(await screen.findByText("Caricamento…")).toHaveClass("text-sm")
        expect(status.querySelector("[data-slot=skeleton]")).toHaveClass("motion-reduce:animate-none")
    })
})
