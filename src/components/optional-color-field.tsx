import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipCustom } from "@/components/tooltip-custom"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"

type OptionalColorFieldProps = {
    /** The chosen color; undefined while no color is wanted. */
    value: string | undefined
    onChange: (color: string | undefined) => void
}

/**
 * "+" button for the creation dialogs, next to the name: it opens the usual color palette of the menus and takes the
 * color that was chosen. Without a color it is a plain "+" button.
 */
export const OptionalColorField = ({ value, onChange }: OptionalColorFieldProps) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const label = value ? t("menu.changeColor") : t("common.addColor")

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <TooltipCustom text={label}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={label}
                        className="size-9 shrink-0"
                        style={value ? { backgroundColor: value } : undefined}
                    >
                        <Plus className={value ? "text-background dark:text-foreground" : undefined} />
                    </Button>
                </PopoverTrigger>
            </TooltipCustom>
            <PopoverContent side="left" align="start" collisionPadding={8} className="w-auto p-0">
                <DialogAddColor
                    item={{ id: 0, color: value }}
                    onPick={color => onChange(color ?? undefined)}
                    setDropDownOpen={setOpen}
                />
            </PopoverContent>
        </Popover>
    )
}
