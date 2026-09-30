import { Plus } from "lucide-react"

type AddButtonProps = {
    onClick?: () => void
    inGroup?: boolean
}

export const AddButton = ({ onClick, inGroup }: AddButtonProps) => {
    return (
        <div className={`flex items-center gap-1 ${inGroup ? 'w-full' : 'w-fit'}`}>
            <button
                onClick={onClick}
                className="group cursor-pointer flex items-center justify-start w-full border border-transparent rounded-xs hover:border-solid hover:border-accent gap-1 p-2 bg-background"
            >
                <Plus className="group-hover:text-foreground text-muted-foreground size-4" />
                <h1 className="text-muted-foreground group-hover:text-foreground text-nowrap text-sm">
                    {inGroup ? "Nuova sezione" : "Nuovo gruppo"}
                </h1>
            </button>
        </div>
    )
}
