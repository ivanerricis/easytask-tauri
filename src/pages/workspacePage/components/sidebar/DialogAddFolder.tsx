import { TooltipCustom } from "@/components/tooltip-custom"
import { useShortcut } from "@/hooks/use-shortcut"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { FolderPlus, Palette, X } from "lucide-react"
import { useState } from "react"

const defaultFolder = {
    name: "",
    color: "#ffb375"
}

export function DialogAddFolder() {

    const [folder, setFolder] = useState(defaultFolder)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const { currentWorkspace } = useWorkspace()
    const { createWorkspaceFolder } = useWorkspaceData()

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        if (folder.name.trim() === "") return
        try {
            await createWorkspaceFolder(currentWorkspace.id, folder.name.trim(), paletteIsOpen ? folder.color : undefined)
            setError(null)
            setIsOpen(false)
            setPaletteOpen(false)
            setFolder(defaultFolder)
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    const handleCancel = () => {
        setError(null)
        setPaletteOpen(false)
        setFolder(defaultFolder)
        setIsOpen(false)
    }

    useShortcut("new-folder", () => {
        setError(null)
        setPaletteOpen(false)
        setFolder(defaultFolder)
        setIsOpen(true)
    })
    const shortcutLabel = useShortcutLabel("new-folder")

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                                    onChange={e => {
                                        setError(null)
                                        setFolder({ ...folder, name: e.target.value })
                                    }}
                                />
                                {error && <p className="text-xs text-destructive">{error}</p>}
                            </div>
                            {paletteIsOpen ?
                                <div className="flex items-center justify-between gap-1">
                                    <div
                                        className="flex items-center justify-center h-full w-full border rounded-xs"
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
                                    <Button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            setPaletteOpen(false)
                                        }}
                                        variant={"buttonIcon"}
                                        className="h-full"
                                    >
                                        <X />
                                    </Button>
                                </div>
                                :
                                <Button
                                    type="button"
                                    variant={"outline"}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setPaletteOpen(true)
                                    }}
                                    className="h-full">
                                    Aggiungi colore
                                    <Palette />
                                </Button>
                            }
                        </div>
                        <DialogFooter className="mt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={handleCancel}
                            >
                                Annulla
                            </Button>
                            <Button
                                type="submit"
                                disabled={!folder.name.trim()}
                            >
                                Crea cartella
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <TooltipCustom text="Crea una cartella" shortcut={shortcutLabel}>
                <Button
                    onClick={() => setIsOpen(true)}
                    variant='buttonIcon'
                    size="icon"
                    aria-label="Crea una cartella"
                >
                    <FolderPlus />
                </Button>
            </TooltipCustom>
        </>
    )
}