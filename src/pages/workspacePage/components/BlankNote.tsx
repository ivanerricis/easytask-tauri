import { BoxIcon } from "@/components/box-icon"

export const BlankNote = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <BoxIcon className="text-foreground w-20 h-20" />
            <p className="text-2xl">Nessuna nota aperta</p>
            <p className="text-primary text-lg">Cerca una nota (Ctrl + O)</p>
            <p className="text-primary text-lg">Crea una nuova nota (Ctrl + N)</p>
            <p className="text-primary text-lg">Crea una nuova cartella (Ctrl + M)</p>
        </div>
    )
}