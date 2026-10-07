import { useEffect, useRef, useState, type MouseEvent } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { PALETTE_COLORS, isPaletteColor } from "@/lib/colors"

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
        <div className={cn("grid grid-cols-4", className)}>
            {PALETTE_COLORS.map(color => {
                const selected = value?.toLowerCase() === color
                return (
                    <button
                        type="button"
                        key={color}
                        aria-label={t("dialogs.color.swatch", { color })}
                        aria-pressed={selected}
                        onClick={e => onPick(color, e)}
                        className={cn(
                            "cursor-pointer size-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                            selected && "ring-2 ring-inset ring-foreground",
                        )}
                        style={{ backgroundColor: color }}
                    />
                )
            })}
            <div
                className={cn("relative flex items-center justify-center size-7", customSelected && "ring-2 ring-inset ring-foreground")}
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
        </div>
    )
}
