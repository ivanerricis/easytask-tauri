import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { Input } from "./ui/input"
import React, { useState } from "react"
import { Separator } from "./ui/separator"

type DialogSettingsProps = {
    className?: string
}

export const DialogSettings = ({ className }: DialogSettingsProps) => {

    const [color, setColor] = useState("#ffb375");

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setColor(e.target.value)
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="buttonIcon" size="icon" className={`absolute left-1 bottom-1 ${className}`}>
                    <Settings />
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[350px]">
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
                        className="flex items-center justify-center w-9 h-9 border rounded-sm"
                        style={{ backgroundColor: color }}
                    >
                        <Input
                            id="color-1"
                            name="color"
                            type="color"
                            className="opacity-0 cursor-pointer"
                            defaultValue={"#ffb375"}
                            value={color}
                            onChange={handleColorChange}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}