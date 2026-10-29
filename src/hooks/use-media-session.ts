import { useEffect, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { reportError } from "@/lib/report-error"

/** What the controls of the system can ask the player to do. */
export type MediaSessionActions = {
    play: () => void
    pause: () => void
    stop: () => void
    seekTo: (seconds: number) => void
    /** Back by `seconds` (the default of the player when the system does not say). */
    seekBackward: (seconds?: number) => void
    seekForward: (seconds?: number) => void
}

type Options = {
    title: string
    artist: string
    playing: boolean
    /** Seconds. */
    position: number
    duration: number
    actions: MediaSessionActions
}

type NativeAction = { action: "play" | "pause" | "stop" | "seekbackward" | "seekforward" | "seekto", seekTime?: number }

const MEDIA_ACTION_EVENT = "media-session-action"

/**
 * On Windows the session of WebView2 is turned off (Windows showed it as "Unknown app") and the backend publishes one
 * for the window of the app (src-tauri/src/media_session.rs); elsewhere the page uses `navigator.mediaSession`.
 */
// The check of isTauri() from @tauri-apps/api/core, read here so that the tests that mock that module do not need it
const isNative = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window && /Windows/i.test(navigator.userAgent)

/**
 * Publishes the track of the player to the system (volume flyout, lock screen, media keys) and runs what they ask for.
 */
export const useMediaSession = ({ title, artist, playing, position, duration, actions }: Options) => {
    const actionsRef = useRef(actions)
    useEffect(() => {
        actionsRef.current = actions
    })

    const native = isNative()

    // --- Native session (Windows) ---

    useEffect(() => {
        if (!native) return
        invoke("media_session_update", { title, artist, playing }).catch(reportError)
    }, [native, title, artist, playing])

    // The flyout does not move the position by itself: once per second while playing is enough
    const second = Math.floor(position)
    const positionRef = useRef(position)
    useEffect(() => { positionRef.current = position })
    useEffect(() => {
        if (!native) return
        invoke("media_session_timeline", { position: positionRef.current, duration: Number.isFinite(duration) ? duration : 0 }).catch(reportError)
    }, [native, second, duration, playing])

    useEffect(() => {
        if (!native) return
        let disposed = false
        let unlisten: (() => void) | undefined
        listen<NativeAction>(MEDIA_ACTION_EVENT, ({ payload }) => {
            const run = actionsRef.current
            switch (payload.action) {
                case "play": return run.play()
                case "pause": return run.pause()
                case "stop": return run.stop()
                case "seekbackward": return run.seekBackward()
                case "seekforward": return run.seekForward()
                case "seekto": if (payload.seekTime !== undefined) run.seekTo(payload.seekTime)
            }
        }).then(stop => {
            if (disposed) stop()
            else unlisten = stop
        }).catch(reportError)
        return () => {
            disposed = true
            unlisten?.()
            invoke("media_session_clear").catch(reportError)
        }
    }, [native])

    // --- navigator.mediaSession (the other systems) ---

    useEffect(() => {
        if (native) return
        const session = typeof navigator === "undefined" ? undefined : navigator.mediaSession
        if (!session || typeof MediaMetadata === "undefined") return
        session.metadata = new MediaMetadata({ title, artist })
        return () => { session.metadata = null }
    }, [native, title, artist])

    useEffect(() => {
        if (native) return
        const session = typeof navigator === "undefined" ? undefined : navigator.mediaSession
        if (session) session.playbackState = playing ? "playing" : "paused"
    }, [native, playing])

    useEffect(() => {
        if (native) return
        const session = typeof navigator === "undefined" ? undefined : navigator.mediaSession
        if (!session) return
        const run = () => actionsRef.current
        const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
            ["play", () => run().play()],
            ["pause", () => run().pause()],
            ["stop", () => run().stop()],
            ["seekto", details => { if (details.seekTime !== undefined) run().seekTo(details.seekTime) }],
            ["seekbackward", details => run().seekBackward(details.seekOffset)],
            ["seekforward", details => run().seekForward(details.seekOffset)],
        ]
        for (const [action, handler] of handlers) {
            try { session.setActionHandler(action, handler) } catch { /* action not supported by this webview */ }
        }
        return () => {
            for (const [action] of handlers) {
                try { session.setActionHandler(action, null) } catch { /* ignore */ }
            }
            session.playbackState = "none"
        }
    }, [native])
}
