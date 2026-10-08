import { useEffect, useRef, useSyncExternalStore } from "react"

/** Window event the app menu fires for the actions that have no shortcut (the component that owns the action listens to it). */
export const APP_COMMAND_EVENT = "easytask:app-command"

export type AppCommand = "open-trash" | "open-archive" | "open-templates" | "note-from-template" | "export-workspace" | "open-workspace-trash"

/** Asks the component that owns `command` to run it. */
export const requestAppCommand = (command: AppCommand): void => {
    window.dispatchEvent(new CustomEvent<AppCommand>(APP_COMMAND_EVENT, { detail: command }))
}

// How many enabled handlers each command has right now, so the menu can disable the entries nobody would run
const activeCounts = new Map<AppCommand, number>()
const storeListeners = new Set<() => void>()

const changeActive = (command: AppCommand, delta: number) => {
    activeCounts.set(command, (activeCounts.get(command) ?? 0) + delta)
    storeListeners.forEach(listener => listener())
}

const subscribe = (listener: () => void) => {
    storeListeners.add(listener)
    return () => { storeListeners.delete(listener) }
}

/**
 * Whether `command` has an enabled handler mounted (the app menu disables the entries that have none).
 * @category Shortcuts
 */
export function useIsAppCommandActive(command: AppCommand): boolean {
    return useSyncExternalStore(subscribe, () => (activeCounts.get(command) ?? 0) > 0)
}

/**
 * Runs `handler` when the app menu requests `command`. While mounted and enabled the command counts as active.
 * @category Shortcuts
 */
export function useAppCommand(command: AppCommand, handler: () => void, options?: { enabled?: boolean }) {
    const enabled = options?.enabled ?? true
    const handlerRef = useRef(handler)
    useEffect(() => { handlerRef.current = handler })

    useEffect(() => {
        if (!enabled) return
        const onCommand = (event: Event) => {
            if ((event as CustomEvent<AppCommand>).detail === command) handlerRef.current()
        }
        window.addEventListener(APP_COMMAND_EVENT, onCommand)
        changeActive(command, 1)
        return () => {
            window.removeEventListener(APP_COMMAND_EVENT, onCommand)
            changeActive(command, -1)
        }
    }, [command, enabled])
}
