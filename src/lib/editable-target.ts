const TEXT_INPUT_TYPES = ["text", "search", "url", "tel", "password"]

/** The editable, writable text field (input, textarea, contenteditable) an event target belongs to, if any. */
export function getEditableTarget(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof HTMLElement)) return null
    if (target.closest("[data-contextmenu]")) return null
    if (target instanceof HTMLInputElement) {
        const type = (target.getAttribute("type") ?? "text").toLowerCase()
        return TEXT_INPUT_TYPES.includes(type) && !target.readOnly && !target.disabled ? target : null
    }
    if (target instanceof HTMLTextAreaElement) {
        return !target.readOnly && !target.disabled ? target : null
    }
    const editable = target.closest<HTMLElement>("[contenteditable]")
    const value = editable?.getAttribute("contenteditable")
    return editable && value !== "false" ? editable : null
}
