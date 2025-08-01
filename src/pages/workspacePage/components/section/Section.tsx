import { SectionHeader } from "./SectionHeader"
import { SectionBody } from "./SectionBody"
import { useState } from "react"
import type { Section as SectionType } from "@/types/types"

type SectionProps = {
    section: SectionType
}

export const Section = ({ section }: SectionProps) => {
    const [isOpen, setOpen] = useState(true)

    const handleOpen = () => {
        setOpen(prev => !prev)

    }

    return (
        <div className="min-w-[250px] border bg-accent rounded-xs flex flex-col p-1">
            <SectionHeader
                isOpen={isOpen}
                onOpenChange={handleOpen}
                section={section}
            />
            <SectionBody isOpen={isOpen} section={section} />
        </div>
    )
}
