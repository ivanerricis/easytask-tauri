import { BoxIcon } from "@/components/BoxIcon"

export const BlankNote = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <BoxIcon className="text-foreground w-24 h-24"/>
            <p className="font-bold text-2xl">Nessuna nota aperta</p>
            <p className="text-primary text-xl">Crea una nuova nota (Ctrl + n)</p>
            <p className="text-primary text-xl">Crea una nuova cartella (Ctrl + m)</p>
        </div>
    )
}