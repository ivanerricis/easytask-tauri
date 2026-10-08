import { useEffect, useRef, useState, type MouseEvent } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { PALETTE_COLORS, isPaletteColor } from "@/lib/colors"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type ColorPaletteProps = {
    /** The current color: its swatch is marked (a color outside the palette is shown in the "+" one). */
    value?: string | null
    /** Called with the chosen color: a swatch click is immediate, the custom one once its picker is closed. */
    onPick: (color: string, event?: MouseEvent) => void
    /** Classes of the grid (the number of columns). */
    className?: string
}

/** The palette to choose the color of an item: the swatches of {@link PALETTE_COLORS} and a "+" one for any other color. */
export const ColorPalette = ({ value, onPick, className }: ColorPaletteProps) => {
    const { t } = useTranslation()
    const inputRef = useRef<HTMLInputElement>(null)
    const [custom, setCustom] = useState("#000000")
    const customSelected = !!value && !isPaletteColor(value)
    const customColor = customSelected ? value : custom
    const selectedColor = PALETTE_COLORS.find(color => value?.toLowerCase() === color) ?? ""

    // The custom picker picks once it is closed: the native `change` event (React's onChange is the `input` event, which
    // fires at every movement inside the picker and would pick, and close the menu, while it is still open)
    useEffect(() => {
        const input = inputRef.current
        if (!input) return
        const commit = () => onPick(input.value)
        input.addEventListener("change", commit)
        return () => input.removeEventListener("change", commit)
    })

    return (
        <ToggleGroup
            type="single"
            value={selectedColor}
            aria-label={t("dialogs.color.palette")}
            className={cn("grid w-auto grid-cols-4 gap-0 rounded-none", className)}
        >
            {PALETTE_COLORS.map((color, index) => {
                const selected = selectedColor === color
                return (
                    <ToggleGroupItem
                        key={color}
                        value={color}
                        aria-label={t("dialogs.color.swatch", { color: t(`common.colors.c${index + 1}` as "common.colors.c1") })}
                        onClick={e => onPick(color, e)}
                        className={cn(
                            "size-7 min-w-0 p-0 rounded-none! hover:text-inherit focus-visible:ring-inset",
                            selected && "ring-2 ring-inset ring-foreground",
                        )}
                        style={{ backgroundColor: color }}
                    />
                )
            })}
            <div
                className={cn(
                    "relative flex items-center justify-center size-7 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring",
                    customSelected && "ring-2 ring-inset ring-foreground",
                )}
                style={{ backgroundColor: customColor }}
            >
                <input
                    ref={inputRef}
                    type="color"
                    aria-label={t("dialogs.color.custom")}
                    // Exactly the area of the square (the browser size of a color input is bigger and would overlap the swatches)
                    className="absolute inset-0 size-full p-0 opacity-0 cursor-pointer"
                    value={customColor}
                    onChange={e => setCustom(e.target.value)}
                />
                <Plus className="absolute pointer-events-none size-5 text-background dark:text-foreground" />
            </div>
        </ToggleGroup>
    )
}
