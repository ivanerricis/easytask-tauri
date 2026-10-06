import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ButtonImportItems } from "./ButtonImportItems"

const importItems = vi.fn()
vi.mock("@/hooks/use-workspace-transfer", () => ({ useItemTransfer: () => ({ importItems, exportItem: vi.fn(), isBusy: false }) }))

describe("ButtonImportItems", () => {
    it("imports into the workspace root", async () => {
        render(<ButtonImportItems />)
        await userEvent.setup().click(screen.getByRole("button", { name: "Importa una nota o una cartella" }))
        expect(importItems).toHaveBeenCalledWith(null)
    })
})
