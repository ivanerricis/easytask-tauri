import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Folder, Note } from "@/types/types"
import type { SidebarItemSize } from "@/lib/store/preferences"
import { ItemFolder } from "../folder/Folder"
import { ItemNote } from "../note/Note"
import { ITEM_SIZES } from "./item-size"

let size: SidebarItemSize = "normal"

vi.mock("@/contexts/use-preferences", () => ({
    usePreferences: () => ({ sidebarItemSize: size }),
}))
vi.mock("@/contexts/use-tabs", () => ({ useTabsActions: () => ({ openNote: vi.fn() }) }))
vi.mock("../folder/ButtonMenuFolder", () => ({ ButtonMenuFolder: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("../note/ButtonMenuNote", () => ({ ButtonMenuNote: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/components/tooltip-custom", () => ({
    TooltipCustom: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock("./tree-row", () => ({
    useTreeRow: () => ({ ref: vi.fn(), attributes: {}, listeners: {}, isDragging: false }),
    isInsideZone: () => false,
    stopDragActivation: {},
    wasTreeJustDragged: () => false,
    treeRowKeyDown: () => undefined,
}))

const folder = { id: 1, name: "Cartella", color: "#ff0000" } as unknown as Folder
const note = { id: 2, name: "Nota", color: "#00ff00" } as unknown as Note

const expected: Record<SidebarItemSize, { row: string, text: string, icon: string }> = {
    compact: { row: "h-6", text: "text-xs", icon: "size-3.5" },
    normal: { row: "h-7", text: "text-sm", icon: "size-4" },
    large: { row: "h-9", text: "text-base", icon: "size-5" },
}

describe.each(["compact", "normal", "large"] as const)("sidebar rows at size %s", (value) => {
    beforeEach(() => { size = value })

    it("ItemNote uses the size classes", () => {
        const { container } = render(<ItemNote note={note} />)
        expect(screen.getByRole("button")).toHaveClass(expected[value].row)
        expect(screen.getByText("Nota")).toHaveClass(expected[value].text)
        expect(container.querySelector("svg")).toHaveClass(expected[value].icon)
    })

    it("ItemFolder uses the size classes, guide and indent", () => {
        const { container } = render(
            <ItemFolder folder={folder} isOpen onToggle={vi.fn()}><div>child</div></ItemFolder>
        )
        expect(screen.getAllByRole("button")[0]).toHaveClass(expected[value].row)
        expect(screen.getByText("Cartella")).toHaveClass(expected[value].text)
        expect(container.querySelector("svg")).toHaveClass(expected[value].icon)
        expect(container.querySelector(`.${CSS.escape(ITEM_SIZES[value].guide)}`)).not.toBeNull()
        expect(screen.getByText("child").parentElement).toHaveClass(ITEM_SIZES[value].indent)
    })
})
