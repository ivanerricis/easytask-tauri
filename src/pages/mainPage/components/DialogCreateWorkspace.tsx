import { useTranslation } from "react-i18next"
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
import { OptionalColorField } from "@/components/optional-color-field"
import { useWorkspace } from "@/contexts/use-workspace"
import { ArrowRight, Plus } from "lucide-react"
import { useId, useState } from "react"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { getErrorMessage } from "@/lib/utils"

export function DialogCreateWorkspace() {
    const { t } = useTranslation()
    const [name, setName] = useState("")
    const [color, setColor] = useState<string | undefined>(undefined)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const { createWorkspace, getWorkspaces } = useWorkspace()
    const { saving, run } = useSubmitOnce()
    const nameId = useId()

    useShortcut("new-workspace", () => setIsOpen(true), { allowInInputs: true })
    const shortcutLabel = useShortcutLabel("new-workspace")

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (name.trim() === "") return
        await run(async () => {
            try {
                await createWorkspace(name.trim(), color)
                await getWorkspaces()
                setError(null)
                setIsOpen(false)
                setName("")
                setColor(undefined)
            } catch (err) {
                setError(getErrorMessage(err))
            }
        })
    }

    const handleCancel = () => {
        setName("")
        setColor(undefined)
        setError(null)
        setIsOpen(false)
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("home.createWorkspace.title")}</DialogTitle>
                        <DialogDescription />
                    </DialogHeader>
                    <form onSubmit={handleCreate}>
                        <div className="grid gap-4">
                            <div className="grid gap-3">
                                <Label htmlFor={nameId}>{t("home.createWorkspace.name")}</Label>
                                <Input
                                    id={nameId}
                                    name="name"
                                    value={name}
                                    onChange={e => {
                                        setError(null)
                                        setName(e.target.value)
                                    }}
                                />
                                {error && (<p className="text-sm text-destructive">{error}</p>)}
                            </div>
                            <OptionalColorField value={color} onChange={setColor} />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={handleCancel}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={!name.trim() || saving}>
                                <Plus />
                                {t("home.createWorkspace.title")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >

            <TooltipCustom text={t("home.createWorkspace.title")} shortcut={shortcutLabel}>
                <Button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center justify-center w-[280px] p-6 rounded-full gap-2 text-lg transition-all"
                >
                    {t("home.createWorkspace.open")}
                    <ArrowRight className="h-5! w-5!" />
                </Button>
            </TooltipCustom>
        </>
    )
}