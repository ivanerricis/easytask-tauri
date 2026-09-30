import { TooltipCustom } from "@/components/tooltip-custom"
import { useShortcut } from "@/hooks/use-shortcut"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
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
import { ArrowRight, Palette, X } from "lucide-react"
import { useState } from "react"
import { getErrorMessage } from "@/lib/utils"

const defaultWorkspace = {
    name: "",
    color: "#ffb375"
}

export function DialogCreateWorkspace() {
    const [workspace, setWorkspace] = useState(defaultWorkspace)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [paletteIsOpen, setPaletteOpen] = useState(false);
    const { createWorkspace, getWorkspaces } = useWorkspace()

    useShortcut("new-workspace", () => setIsOpen(true), { allowInInputs: true })
    const shortcutLabel = useShortcutLabel("new-workspace")

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (workspace.name.trim() === "") return
        try {
            await createWorkspace(workspace.name.trim(), paletteIsOpen ? workspace.color : undefined)
            await getWorkspaces()
            setError(null)
            setIsOpen(false)
            setWorkspace(defaultWorkspace)
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    const handleCancel = () => {
        setWorkspace(defaultWorkspace)
        setError(null)
        setIsOpen(false)
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Crea Workspace</DialogTitle>
                        <DialogDescription />
                    </DialogHeader>
                    <form onSubmit={handleCreate}>
                        <div className="grid gap-4">
                            <div className="grid gap-3">
                                <Label>Nome</Label>
                                <Input
                                    id="name-1"
                                    name="name"
                                    value={workspace.name}
                                    onChange={e => {
                                        setError(null)
                                        setWorkspace({
                                            ...workspace,
                                            name: e.target.value
                                        })
                                    }}
                                />
                                {error && (<p className="text-sm text-destructive">{error}</p>)}
                            </div>
                            {paletteIsOpen ?
                                <div className="flex items-center justify-between gap-1">
                                    <div
                                        className="flex items-center justify-center h-full w-full border rounded-xs"
                                        style={{ backgroundColor: workspace.color }}
                                    >
                                        <Input
                                            id="color-1"
                                            name="color"
                                            type="color"
                                            className="opacity-0 cursor-pointer"
                                            value={workspace.color}
                                            onChange={e => setWorkspace({
                                                ...workspace,
                                                color: e.target.value
                                            })}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); setPaletteOpen(false) }}
                                        variant={"buttonIcon"}
                                        aria-label="Chiudi la tavolozza"
                                        className="h-full"
                                    >
                                        <X />
                                    </Button>
                                </div>
                                :
                                <Button
                                    type="button"
                                    variant={"outline"}
                                    onClick={(e) => { e.preventDefault(); setPaletteOpen(true) }}
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
                            <Button type="submit" disabled={!workspace.name}>
                                Crea Workspace
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >

            <TooltipCustom text="Crea Workspace" shortcut={shortcutLabel}>
                <Button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center justify-center w-[280px] p-6 rounded-full gap-2 text-lg transition-all"
                >
                    Crea un nuovo Workspace
                    <ArrowRight className="h-5! w-5!" />
                </Button>
            </TooltipCustom>
        </>
    )
}