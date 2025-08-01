import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { TooltipCustom } from "@/components/tooltip-custom"
import { usePreferences } from "@/contexts/preferences-context"
import { Checkbox } from "@/components/ui/checkbox"

type DialogSettingsProps = {
    className?: string
}

export const DialogSettings = ({ className }: DialogSettingsProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const {
        primaryColor, setPrimaryColor,
        showProgressBar, setShowProgressBar,
        showSectionCount, setShowSectionCount,
        showTaskCount, setShowTaskCount,
        resetPlayerPosition
    } = usePreferences()

    const handleColorChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setPrimaryColor(e.target.value)
    }

    const handleProgressBar = async () => {
        setShowProgressBar(!showProgressBar)
    }

    const handleSectionCount = async () => {
        setShowSectionCount(!showSectionCount)
    }

    const handleTaskCount = async () => {
        setShowTaskCount(!showTaskCount)
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogDescription />
                    <DialogHeader>
                        <DialogTitle>
                            Impostazioni
                        </DialogTitle>
                    </DialogHeader>
                    <Separator />
                    <DialogHeader className="font-bold">
                        Aspetto
                    </DialogHeader>

                    <div className="flex items-center justify-between w-full">
                        <h1 className="text-sm">
                            Cambia tema:
                        </h1>
                        <ModeToggle />
                    </div>
                    <div className="flex items-center justify-between w-full">
                        <h1 className="text-sm">
                            Colore d'accento:
                        </h1>
                        <div
                            className="flex items-center justify-center size-5 border rounded-xs"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Input
                                type="color"
                                className="opacity-0 cursor-pointer"
                                value={primaryColor}
                                onChange={handleColorChange}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-sm">
                            Mostra barra d'avanzamento nelle sezioni
                        </h1>
                        <Checkbox
                            checked={showProgressBar}
                            onCheckedChange={handleProgressBar}
                            className="size-5"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-sm">
                            Mostra numero di sezioni
                        </h1>
                        <Checkbox
                            checked={showSectionCount}
                            onCheckedChange={handleSectionCount}
                            className="size-5"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-sm">
                            Mostra numero di task
                        </h1>
                        <Checkbox
                            checked={showTaskCount}
                            onCheckedChange={handleTaskCount}
                            className="size-5"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-sm">
                            Ripristina la posizione del player audio
                        </h1>
                        <Button
                            variant={"outline"}
                            size={"sm"}
                            onClick={resetPlayerPosition}
                            className=""
                        >
                            Reset
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <TooltipCustom text="Impostazioni">
                <Button
                    onClick={() => setIsOpen(true)}
                    variant="buttonIcon"
                    size="icon"
                    className={`absolute left-1 bottom-1 !hover:bg-accent ${className}`}
                >
                    <Settings />
                </Button>
            </TooltipCustom>
        </>
    )
}