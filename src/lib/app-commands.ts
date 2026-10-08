import { useEffect, useRef } from "react"

/** Window event the app menu fires for the actions that have no shortcut (the component that owns the action listens to it). */
export const APP_COMMAND_EVENT = "easytask:app-command"

export type AppCommand = "open-trash" | "open-archive" | "open-templates" | "note-from-template" | "export-workspace" | "open-workspace-trash"

/** Asks the component that owns `command` to run it. */
export const requestAppCommand = (command: AppCommand): void => {
    window.dispatchEvent(new CustomEvent<AppCommand>(APP_COMMAND_EVENT, { detail: command }))
}

/**
 * Runs `handler` when the app menu requests `command`.
 * @category Shortcuts
 */
export function useAppCommand(command: AppCommand, handler: () => void) {
    const handlerRef = useRef(handler)
    useEffect(() => { handlerRef.current = handler })

    useEffect(() => {
        const onCommand = (event: Event) => {
            if ((event as CustomEvent<AppCommand>).detail === command) handlerRef.current()
        }
        window.addEventListener(APP_COMMAND_EVENT, onCommand)
        return () => window.removeEventListener(APP_COMMAND_EVENT, onCommand)
    }, [command])
}
