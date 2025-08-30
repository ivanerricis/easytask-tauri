import { Link2, Plus } from "lucide-react"
import { open } from "@tauri-apps/plugin-dialog"

type AddButtonProps = {
    onClick?: () => void
    inGroup?: boolean
}

export const AddButton = ({ onClick, inGroup }: AddButtonProps) => {

    const handleAddFile = async () => {
        const selectedPath = await open({
            multiple: false,
            filters: [{
                name: 'Audio',
                extensions: ['mp3', 'flac', 'wav']
            }]
        })
        if (selectedPath && typeof selectedPath === 'string') {
            const fileName = selectedPath.split('/').pop()
            console.log("Nome del file: ", fileName)
            console.log("Percorso del file: ", selectedPath)
        }
    }

    return (
        <div className={`flex items-center gap-1 ${inGroup ? 'w-full' : 'w-fit'}`}>
            <button
                onClick={onClick}
                className="group cursor-pointer flex items-center justify-start w-full border border-transparent rounded-xs hover:border-solid hover:border-accent gap-1 p-2 bg-background"
            >
                <Plus className="group-hover:text-foreground text-muted-foreground size-4" />
                <h1 className="text-muted-foreground group-hover:text-foreground text-nowrap text-sm">
                    Nuova sezione
                </h1>
            </button>
            {inGroup &&
                <button
                    onClick={handleAddFile}
                    className="group flex items-center justify-center p-2 border border-transparent rounded-xs hover:border-solid hover:border-accent cursor-pointer bg-background">
                    <Link2 className="text-muted-foreground group-hover:text-foreground size-5 -rotate-45" />
                </button>}
        </div>
    )
}