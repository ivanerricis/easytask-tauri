import { SectionHeader } from "./SectionHeader"
import { SectionBody } from "./SectionBody"
import { useState } from "react"
import type { Section as SectionType } from "@/types"

type SectionProps = {
    section: SectionType
    dragHandleProps?: any
}

export const Section = ({ section, dragHandleProps }: SectionProps) => {
    const [isOpen, setOpen] = useState(true)

    const handleOpen = () => {
        setOpen(prev => !prev)

    }

    return (
        <div className="min-w-[250px] border bg-secondary h-full flex flex-col">
            <SectionHeader
                isOpen={isOpen}
                onOpenChange={handleOpen}
                section={section}
                dragHandleProps={dragHandleProps}
            />
            <SectionBody isOpen={isOpen} section={section} />
        </div>
    )
}
