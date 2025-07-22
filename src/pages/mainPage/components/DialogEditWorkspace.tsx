import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Workspace } from "@/types/types"
import { useWorkspace } from "@/contexts/workspace-context"
import React, { useEffect, useState } from "react"
import { Palette, X } from "lucide-react"

type DialogEditProps = {
    workspace: Workspace
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

type defaultWorkspaceType = {
    name: string
    color?: string
}

export const DialogEditWorkspace = ({ workspace, isOpen, onOpenChange }: DialogEditProps) => {
    const defaultWorkspace: defaultWorkspaceType = { name: workspace.name, color: workspace.color }
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const [newWorkspace, setWorkspace] = useState(defaultWorkspace)
    const { editWorkspace, getWorkspaces } = useWorkspace()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (workspace.color) {
            setPaletteOpen(true)
            setWorkspace({ name: workspace.name, color: workspace.color })
        }
        else
            setWorkspace({ name: workspace.name, color: "#FFFFFF" })
    }, [])

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newWorkspace.name.trim() === "") return
        try {
            await editWorkspace(workspace.id, newWorkspace.name.trim(), paletteIsOpen ? newWorkspace.color : undefined)
            await getWorkspaces()
            setError(null)
            onOpenChange(false)
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleCancel = () => {
        setWorkspace(defaultWorkspace)
        setPaletteOpen(false)
        setError(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Modifica il Workspace</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleEdit}>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label>Nome</Label>
                            <Input
                                id="name-1"
                                name="name"
                                value={newWorkspace.name}
                                onChange={e => {
                                    setError(null)
                                    setWorkspace({ ...newWorkspace, name: e.target.value })
                                }}
                            />
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>
                        {paletteIsOpen ?
                            <div className="flex items-center justify-between gap-1">
                                <div
                                    className="flex items-center justify-center h-full w-full border rounded-xs"
                                    style={{ backgroundColor: newWorkspace.color }}
                                >
                                    <Input
                                        id="color-1"
                                        name="color"
                                        type="color"
                                        className="opacity-0 cursor-pointer"
                                        value={newWorkspace.color}
                                        onChange={e => {
                                            setWorkspace({
                                                ...newWorkspace,
                                                color: e.target.value
                                            })
                                        }}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setPaletteOpen(false)
                                        setWorkspace({ ...newWorkspace, color: "#FFFFFF" })
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
                                onClick={() => { setPaletteOpen(true) }}
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
                            disabled={!newWorkspace.name}
                        >
                            Salva
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}