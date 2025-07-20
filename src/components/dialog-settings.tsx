import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { Input } from "./ui/input"
import React, { useEffect, useState } from "react"
import { Separator } from "./ui/separator"
import { TooltipCustom } from "./tooltip-custom"
import { store } from "@/lib/store/initStore"

type DialogSettingsProps = {
    className?: string
}

export const DialogSettings = ({ className }: DialogSettingsProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [color, setColor] = useState("#ffb375");

    useEffect(() => {
        if (isOpen) {
            const loadColor = async () => {
                const savedColor = await store.get<{ hex: string }>('primaryColor');
                if (savedColor?.hex) {
                    setColor(savedColor.hex);
                }
            };
            loadColor();
        }
    }, [isOpen]);

    const handleColorChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHexColor = e.target.value;
        setColor(newHexColor);

        document.documentElement.style.setProperty('--primary', newHexColor);

        await store.set('primaryColor', { hex: newHexColor });
        await store.save();
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="w-[350px]">
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
                            className="flex items-center justify-center w-9 h-9 border rounded-xs"
                            style={{ backgroundColor: color }}
                        >
                            <Input
                                type="color"
                                className="opacity-0 cursor-pointer"
                                value={color}
                                onChange={handleColorChange}
                            />
                        </div>
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