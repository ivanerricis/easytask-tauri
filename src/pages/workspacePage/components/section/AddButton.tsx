import { Plus } from "lucide-react"

type AddButtonProps = {
    onClick?: () => void
}

export const AddButton = ({onClick}:  AddButtonProps) => {
    return (
        <button
            role="button"
            onClick={onClick}
            className="group cursor-pointer flex items-center justify-center border border-dashed gap-1 p-2 bg-background"
        >
            <Plus size={20} className="group-hover:text-foreground text-muted-foreground" />
            <h1 className="text-muted-foreground group-hover:text-foreground text-nowrap">
                Aggiungi una sezione
            </h1>
        </button>
    )
}