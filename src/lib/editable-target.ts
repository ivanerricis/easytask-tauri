const TEXT_INPUT_TYPES = ["text", "search", "url", "tel", "password", "email", "number"]

/**
 * The text field (input, textarea, contenteditable) an event target belongs to, if any.
 * Read-only fields are included (the menu offers only Copy and Select all there), except the ones inside an element with
 * its own right click menu (`data-contextmenu`, see ItemMenu): the read-only text of a task opens the menu of the task.
 * A writable field inside such an element keeps the text menu (ItemMenu lets it through). Disabled fields have none.
 */
export function getEditableTarget(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof HTMLElement)) return null
    const owned = target.closest("[data-contextmenu]") !== null
    if (target instanceof HTMLInputElement) {
        const type = (target.getAttribute("type") ?? "text").toLowerCase()
        return TEXT_INPUT_TYPES.includes(type) && !target.disabled && !(owned && target.readOnly) ? target : null
    }
    if (target instanceof HTMLTextAreaElement) {
        return !target.disabled && !(owned && target.readOnly) ? target : null
    }
    if (owned) return null
    const editable = target.closest<HTMLElement>("[contenteditable]")
    const value = editable?.getAttribute("contenteditable")
    return editable && value !== "false" ? editable : null
}
