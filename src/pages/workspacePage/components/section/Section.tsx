import { SectionHeader } from "./SectionHeader"
import { SectionBody } from "./SectionBody"
import { useCallback, useState } from "react"
import type { HTMLAttributes } from "react"
import type { Section as SectionType } from "@/types/types"
import { cn } from "@/lib/utils"
import { useNoteDrag, useNoteDrop } from "../note-dnd-state"

type SectionProps = {
    section: SectionType
}

export const Section = ({ section }: SectionProps) => {
    const [isOpen, setOpen] = useState(true)
    const { setNodeRef: setDropRef, zone, active } = useNoteDrop("section", section.id)
    const { setNodeRef: setDragRef, setActivatorNodeRef, attributes, listeners, isDragging } = useNoteDrag("section", section.id)

    // The card is both a drop target (sections and tasks) and the dimmed source while it is dragged
    const setRef = useCallback((node: HTMLElement | null) => {
        setDropRef(node)
        setDragRef(node)
    }, [setDropRef, setDragRef])

    const handleOpen = () => {
        setOpen(prev => !prev)
    }

    const draggingSection = active?.kind === "section"

    return (
        <div
            ref={setRef}
            className={cn(
                "relative min-w-[250px] border bg-accent rounded-xs flex flex-col p-1",
                isDragging && "opacity-40",
                !draggingSection && zone && "ring-2 ring-primary",
            )}
        >
            {draggingSection && (zone === "before" || zone === "after") &&
                <div className={cn("pointer-events-none absolute left-0 right-0 z-10 h-0.5 bg-primary", zone === "before" ? "-top-[3px]" : "-bottom-[3px]")} />}
            <SectionHeader
                isOpen={isOpen}
                onOpenChange={handleOpen}
                section={section}
                dragHandleRef={setActivatorNodeRef}
                dragHandleProps={{ ...attributes, ...listeners } as HTMLAttributes<HTMLDivElement>}
            />
            <SectionBody isOpen={isOpen} section={section} />
        </div>
    )
}
