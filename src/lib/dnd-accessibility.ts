import type { Active, Announcements, Over, ScreenReaderInstructions } from "@dnd-kit/core"
import i18n from "@/i18n"

type Draggable = Active | Over

/**
 * How a context describes what is being dragged or hovered. Returns the display name of the element, or
 * undefined when the element is unknown (the announcements then fall back to a generic text).
 */
export type DndDescriber = (entry: Draggable) => string | undefined

/**
 * Screen reader texts of a dnd-kit context, translated in the current language and naming the elements involved.
 * `keyboard` selects the instructions of the contexts that have a keyboard sensor; the others point to the move menu.
 * @category Accessibility
 */
export function buildDndAccessibility(describe: DndDescriber, { keyboard }: { keyboard: boolean }): {
    announcements: Announcements
    screenReaderInstructions: ScreenReaderInstructions
} {
    const name = (entry: Draggable) => describe(entry) ?? i18n.t("dnd.unknownItem")
    return {
        screenReaderInstructions: {
            draggable: keyboard ? i18n.t("dnd.instructions.keyboard") : i18n.t("dnd.instructions.pointer"),
        },
        announcements: {
            onDragStart: ({ active }) => i18n.t("dnd.start", { name: name(active) }),
            onDragOver: ({ active, over }) =>
                over ? i18n.t("dnd.over", { name: name(active), target: name(over) }) : i18n.t("dnd.overNone", { name: name(active) }),
            onDragEnd: ({ active, over }) =>
                over ? i18n.t("dnd.end", { name: name(active), target: name(over) }) : i18n.t("dnd.endNone", { name: name(active) }),
            onDragCancel: ({ active }) => i18n.t("dnd.cancel", { name: name(active) }),
        },
    }
}
