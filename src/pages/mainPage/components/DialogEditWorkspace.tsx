import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Workspace } from "@/types"
import { useWorkspace } from "@/contexts/workspace-context"
import { useEffect, useState } from "react"

type DialogEditProps = {
    workspace: Workspace
}

const defaultWorkspace = {
    name: "",
    color: ""
}

export const DialogEditWorkspace = ({ workspace }: DialogEditProps) => {

    const [isOpen, setIsOpen] = useState(false)
    const [newWorkspace, setWorkspace] = useState(defaultWorkspace)
    const { editWorkspace, getWorkspaces } = useWorkspace()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setWorkspace({
            name: workspace.name,
            color: workspace.color
        })
    }, [workspace])

    const onSave = async () => {
        try {
            await editWorkspace(workspace.id, newWorkspace.name, newWorkspace.color)
            await getWorkspaces()
            setIsOpen(false)
        } catch (error: any) {
            if (error.message?.includes('EMPTY_NAME'))
                setError('Il nome del Workspace non può essere vuoto')
            else if (error.message?.includes('WORKSPACE_EXISTS')) {
                setError('Esiste già un Workspace con questo nome')
            }
            else if (error.message?.includes('GENERIC_ERROR'))
                setError('Errore durante la creazione del Workspace')
            return // prevenire la chiusura in caso di errore
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSave();
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    onClick={(e) => { e.stopPropagation() }}
                    variant={"ghost"}
                    size={"sm"}
                    className="hover:text-foreground justify-start rounded-sm"
                >
                    Modifica
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Modifica il Workspace</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-3">
                        <Label>Nome</Label>
                        <Input
                            id="name-1"
                            name="name"
                            value={newWorkspace.name}
                            onChange={e => { setWorkspace({ ...newWorkspace, name: e.target.value }) }}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    {error && <p className="text-destructive">{error}</p>}
                    <div className="grid gap-3">
                        <Label>Colore</Label>
                        <div
                            className="flex items-center justify-center h-full w-full border rounded-sm"
                            style={{ backgroundColor: newWorkspace.color }}
                        >
                            <Input
                                id="color-1"
                                name="color"
                                type="color"
                                className="opacity-0 cursor-pointer"
                                value={newWorkspace.color}
                                onChange={e => { setWorkspace({ ...newWorkspace, color: e.target.value }) }}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">
                            Annulla
                        </Button>
                    </DialogClose>
                    <Button onClick={onSave} disabled={!newWorkspace.name}>
                        Salva
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}