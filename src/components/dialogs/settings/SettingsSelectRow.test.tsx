import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SelectItem } from "@/components/ui/select"
import { SettingsSelectRow } from "./SettingsRow"

const renderRow = (props: Partial<React.ComponentProps<typeof SettingsSelectRow>> = {}) => render(
    <SettingsSelectRow label="Lingua" description="Scegli la lingua" value="it" onValueChange={() => undefined} width="w-40" {...props}>
        <SelectItem value="it">Italiano</SelectItem>
        <SelectItem value="en">English</SelectItem>
    </SettingsSelectRow>,
)

describe("SettingsSelectRow", () => {
    it("names the select with the label, describes it and sizes it", () => {
        renderRow()
        const trigger = screen.getByRole("combobox", { name: "Lingua" })
        expect(trigger).toHaveAccessibleDescription("Scegli la lingua")
        expect(trigger).toHaveClass("w-40")
        expect(trigger).toHaveTextContent("Italiano")
    })

    it("reports the chosen value", async () => {
        const onValueChange = vi.fn()
        renderRow({ onValueChange })
        await userEvent.click(screen.getByRole("combobox", { name: "Lingua" }))
        await userEvent.click(await screen.findByRole("option", { name: "English" }))
        expect(onValueChange).toHaveBeenCalledWith("en")
    })

    it("can be disabled", () => {
        renderRow({ disabled: true })
        expect(screen.getByRole("combobox", { name: "Lingua" })).toBeDisabled()
    })
})
