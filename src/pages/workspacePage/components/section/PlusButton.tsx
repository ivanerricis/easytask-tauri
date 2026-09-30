import { Plus } from "lucide-react"

type PlusButtonProps = {
    disabled?: boolean
    onClick?: () => void
}

export const PlusButton = ({disabled, onClick}: PlusButtonProps) => {
    return (
        <button
            disabled={disabled}
            type="submit"
            aria-label="Aggiungi"
            onClick={onClick}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group/add flex items-center justify-center w-full h-8 disabled:cursor-not-allowed"
        >
            <Plus size={20} className="group-hover/add:text-foreground text-muted-foreground" />
        </button>
    )
}