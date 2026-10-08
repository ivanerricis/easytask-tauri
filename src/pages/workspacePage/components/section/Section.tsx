import { SectionHeader } from "./SectionHeader"
import { SectionBody } from "./SectionBody"
import { memo, useCallback } from "react"
import type { Section as SectionType } from "@/types/types"
import { cn } from "@/lib/utils"
import { useNoteDrag, useNoteDrop } from "../note-dnd-state"
import { useSectionOpen } from "@/contexts/use-tabs"
import { DropLine } from "../sidebar/DropLine"

type SectionProps = {
    section: SectionType
}

export const Section = memo(({ section }: SectionProps) => {
    // Kept per note, so it survives tab switches
    const [isOpen, toggleOpen] = useSectionOpen(section.id)
    const { setNodeRef: setDropRef, zone, active } = useNoteDrop("section", section.id)
    const { setNodeRef: setDragRef, dragProps, isDragging } = useNoteDrag("section", section.id)

    // The card is both a drop target (sections and tasks) and the dimmed source while it is dragged
    const setRef = useCallback((node: HTMLElement | null) => {
        setDropRef(node)
        setDragRef(node)
    }, [setDropRef, setDragRef])

    const draggingSection = active?.kind === "section"

    return (
        <div
            ref={setRef}
            data-section-card
            className={cn(
                // As wide as its group (the group caps the column width)
                "relative w-full min-w-[250px] border bg-accent rounded-xs flex flex-col p-1",
                isDragging && "opacity-40",
                !draggingSection && zone && "ring-2 ring-primary",
            )}
        >
            {draggingSection && <DropLine zone={zone} className={zone === "before" ? "-top-[3px]" : "-bottom-[3px]"} />}
            <SectionHeader
                isOpen={isOpen}
                onOpenChange={toggleOpen}
                section={section}
                dragProps={dragProps}
            />
            <SectionBody isOpen={isOpen} section={section} />
        </div>
    )
})
