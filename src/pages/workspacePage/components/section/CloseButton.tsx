import { X } from "lucide-react"

type CloseButtonProps = {
    onClick?: () => void
}

export const CloseButton = ({onClick}: CloseButtonProps) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group/close cursor-pointer flex items-center justify-center w-full h-8"
        >
            <X size={20} className="group-hover/close:text-foreground text-muted-foreground" />
        </button>
    )
}