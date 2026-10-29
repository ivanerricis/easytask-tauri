import { useEffect, useRef } from "react"

/**
 * A typed event on `window`: `emit` dispatches a CustomEvent with the payload as detail, `useListen` runs the latest
 * handler for each one while the component is mounted (the handler may change on every render).
 * @param name The event name.
 */
export const createWindowEvent = <T>(name: string) => ({
    emit: (detail: T): void => {
        window.dispatchEvent(new CustomEvent<T>(name, { detail }))
    },
    useListen: (handler: (detail: T) => void): void => {
        const handlerRef = useRef(handler)
        useEffect(() => { handlerRef.current = handler })
        useEffect(() => {
            const onEvent = (event: Event) => handlerRef.current((event as CustomEvent<T>).detail)
            window.addEventListener(name, onEvent)
            return () => window.removeEventListener(name, onEvent)
        }, [])
    },
})
