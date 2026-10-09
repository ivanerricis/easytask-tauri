import type { ComponentType, SVGProps } from "react"
import { KbdKeys } from "@/components/kbd"
import { useShortcutKeys } from "@/contexts/use-shortcuts"
import { cn } from "@/lib/utils"

const Hint = ({ id, label }: { id: string, label: string }) => {
    const keys = useShortcutKeys(id)
    return (
        <p className="flex items-center gap-2 text-primary text-lg">
            {label}
            <KbdKeys keys={keys} />
        </p>
    )
}

type EmptyStateProps = {
    icon: ComponentType<SVGProps<SVGSVGElement>>
    title: string
    /** Shortcuts suggested under the title: id of the shortcut and its label. */
    hints: readonly { id: string, label: string }[]
    className?: string
}

/** The centered placeholder of the note area ("no note open", "empty note"): icon, title and the useful shortcuts. */
export const EmptyState = ({ icon: Icon, title, hints, className }: EmptyStateProps) => (
    <div className={cn("flex flex-col items-center justify-center w-full h-full", className)}>
        <Icon aria-hidden className="text-foreground w-20 h-20" />
        <p className="text-2xl">{title}</p>
        {hints.map(hint => <Hint key={hint.id} {...hint} />)}
    </div>
)
