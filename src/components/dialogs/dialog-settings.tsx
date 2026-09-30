import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { useState } from "react"
import { TooltipCustom } from "@/components/tooltip-custom"
import { SettingsNav } from "./settings/SettingsNav"
import { SETTINGS_CATEGORIES } from "./settings/categories"

type DialogSettingsProps = {
    className?: string
}

export const DialogSettings = ({ className }: DialogSettingsProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [activeId, setActiveId] = useState(SETTINGS_CATEGORIES[0].id)
    const active = SETTINGS_CATEGORIES.find(c => c.id === activeId) ?? SETTINGS_CATEGORIES[0]
    const Panel = active.Panel

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-3xl h-[min(560px,80vh)] grid-rows-[auto_1fr] overflow-hidden">
                    <DialogDescription className="sr-only">
                        Impostazioni dell'applicazione suddivise per categoria
                    </DialogDescription>
                    <DialogHeader>
                        <DialogTitle>Impostazioni</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col sm:flex-row gap-4 min-h-0">
                        <SettingsNav
                            categories={SETTINGS_CATEGORIES}
                            activeId={active.id}
                            onSelect={setActiveId}
                        />
                        <div className="flex-1 min-w-0 overflow-y-auto pr-1">
                            <Panel />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <TooltipCustom text="Impostazioni">
                <Button
                    onClick={() => setIsOpen(true)}
                    variant="buttonIcon"
                    size="icon"
                    aria-label="Impostazioni"
                    className={`absolute left-1 bottom-1 !hover:bg-accent ${className}`}
                >
                    <Settings />
                </Button>
            </TooltipCustom>
        </>
    )
}
