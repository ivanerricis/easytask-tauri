import { useEffect, type RefObject } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useStoreSelector } from "@/lib/external-store"
import type { NoteSearchStore } from "./note-search-store"

const ICON_BUTTON = "relative size-7 after:absolute after:-inset-0.5 after:content-[''] [&_svg]:!size-4"

type NoteSearchFieldProps = {
    store: NoteSearchStore
    inputRef: RefObject<HTMLInputElement | null>
}

/** The search field of the path bar: the query, the counter ("3 di 12"), the arrows between the matches and the close button. */
export const NoteSearchField = ({ store, inputRef }: NoteSearchFieldProps) => {
    const { t } = useTranslation()
    const query = useStoreSelector(store, s => s.query)
    const total = useStoreSelector(store, s => s.matches.length)
    const activeIndex = useStoreSelector(store, s => s.activeIndex)

    useEffect(() => {
        inputRef.current?.focus()
    }, [inputRef])

    const counter = !query.trim() ? "" : total === 0 ? t("notes.noteSearch.noResults") : t("notes.noteSearch.counter", { current: activeIndex + 1, total })

    return (
        <div role="search" className="flex items-center gap-1">
            <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => store.setQuery(e.target.value)}
                onKeyDown={e => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                        store.step(e.shiftKey ? -1 : 1)
                    } else if (e.key === "Escape") {
                        // Closes the search only: the other Esc handlers (task selection, dialogs) must not react too
                        e.preventDefault()
                        e.stopPropagation()
                        store.close()
                    }
                }}
                placeholder={t("notes.noteSearch.placeholder")}
                aria-label={t("notes.noteSearch.inNote")}
                className="h-7 w-44 px-2 py-0 text-sm md:text-sm"
            />
            <span aria-live="polite" className="min-w-14 whitespace-nowrap text-center text-xs tabular-nums text-muted-foreground">{counter}</span>
            <TooltipCustom text={t("notes.noteSearch.previous")}>
                {/* The span keeps the tooltip when the button is disabled (a disabled button gets no pointer events) */}
                <span className="inline-flex">
                    <Button type="button" variant="ghost" size="icon" className={ICON_BUTTON} disabled={total === 0}
                        aria-label={t("notes.noteSearch.previous")} onClick={() => store.step(-1)}>
                        <ChevronUp />
                    </Button>
                </span>
            </TooltipCustom>
            <TooltipCustom text={t("notes.noteSearch.next")}>
                {/* The span keeps the tooltip when the button is disabled (a disabled button gets no pointer events) */}
                <span className="inline-flex">
                    <Button type="button" variant="ghost" size="icon" className={ICON_BUTTON} disabled={total === 0}
                        aria-label={t("notes.noteSearch.next")} onClick={() => store.step(1)}>
                        <ChevronDown />
                    </Button>
                </span>
            </TooltipCustom>
            <TooltipCustom text={t("notes.noteSearch.close")}>
                <Button type="button" variant="ghost" size="icon" className={ICON_BUTTON}
                    aria-label={t("notes.noteSearch.close")} onClick={() => store.close()}>
                    <X />
                </Button>
            </TooltipCustom>
        </div>
    )
}
