import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { FolderPlus } from "lucide-react"
import { useEffect, useState } from "react"

const defaultFolder = {
    name: "",
    color: "#ffb375"
}

export function DialogAddFolder() {

    const [folder, setFolder] = useState(defaultFolder)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const { currentWorkspace } = useWorkspace()
    const { createWorkspaceFolder, getWorkspaceData } = useWorkspaceData()

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        if (folder.name.trim() === "") return
        try {
            await createWorkspaceFolder(currentWorkspace.id, folder.name.trim(), folder.color)
            await getWorkspaceData(currentWorkspace.id)
            setError(null)
            setIsOpen(false)
        } catch (error: any) {
            if (error.message?.includes('EMPTY_NAME'))
                setError('Il nome non della cartella può essere vuoto')
            else if (error.message?.includes('FOLDER_EXISTS'))
                setError('Esiste già una cartella con questo nome')
            else if (error.message?.includes('GENERIC_ERROR'))
                setError('Errore durante la creazione della cartella')
            return
        } finally {
            setFolder(defaultFolder)
        }
    }

    const handleCancel = () => {
        setFolder(defaultFolder)
        setError(null)
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isTyping = document.activeElement && (
                document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA' ||
                (document.activeElement as HTMLElement).isContentEditable
            )

            if (isTyping) return

            if (e.key === "m" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setIsOpen(true)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant='buttonIcon' size="icon">
                    <FolderPlus />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crea una cartella</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleCreateFolder}>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label>Nome</Label>
                            <Input
                                id="name-1"
                                name="name"
                                value={folder.name}
                                onChange={e => setFolder({
                                    ...folder,
                                    name: e.target.value
                                })}
                            />
                        </div>
                        {error && <p className="text-destructive">{error}</p>}
                        <div className="grid gap-3">
                            <Label>Colore</Label>
                            <div className="flex items-center justify-center h-full w-full border rounded-xs"
                                style={{ backgroundColor: folder.color }}
                            >
                                <Input
                                    id="color-1"
                                    name="color"
                                    type="color"
                                    className="opacity-0 cursor-pointer"
                                    value={folder.color}
                                    onChange={e => setFolder({
                                        ...folder,
                                        color: e.target.value
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                            <Button variant="outline" type="button" onClick={handleCancel}>
                                Annulla
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={!folder.name}>Crea cartella</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}