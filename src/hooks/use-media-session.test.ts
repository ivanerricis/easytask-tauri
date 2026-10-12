import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"

const invoke = vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve())
const unlisten = vi.fn()
let emit: ((event: { payload: unknown }) => void) | undefined
let tauri = true

vi.mock("@tauri-apps/api/core", () => ({
    invoke: (...args: unknown[]) => invoke(...args),
    isTauri: () => tauri,
}))
vi.mock("@tauri-apps/api/event", () => ({
    listen: (_event: string, handler: (event: { payload: unknown }) => void) => {
        emit = handler
        return Promise.resolve(unlisten)
    },
}))

const { useMediaSession } = await import("./use-media-session")

const actions = () => ({
    play: vi.fn(), pause: vi.fn(), stop: vi.fn(), seekTo: vi.fn(), seekBackward: vi.fn(), seekForward: vi.fn(),
})

const base = { title: "song.mp3", artist: "EasyTask", playing: false, position: 0, duration: 120 }

describe("useMediaSession on Windows (native session)", () => {
    const userAgent = navigator.userAgent

    beforeEach(() => {
        tauri = true
        emit = undefined
        invoke.mockClear()
        unlisten.mockClear()
        Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", configurable: true })
    })

    afterEach(() => {
        Object.defineProperty(navigator, "userAgent", { value: userAgent, configurable: true })
    })

    it("publishes the track, the state and the timeline to the backend", () => {
        const { rerender } = renderHook(props => useMediaSession(props), { initialProps: { ...base, actions: actions() } })
        expect(invoke).toHaveBeenCalledWith("media_session_update", { title: "song.mp3", artist: "EasyTask", playing: false })
        expect(invoke).toHaveBeenCalledWith("media_session_timeline", { position: 0, duration: 120 })

        rerender({ ...base, playing: true, position: 0.4, actions: actions() })
        expect(invoke).toHaveBeenCalledWith("media_session_update", { title: "song.mp3", artist: "EasyTask", playing: true })
    })

    it("sends the timeline once per second, not at every time update", () => {
        const { rerender } = renderHook(props => useMediaSession(props), { initialProps: { ...base, playing: true, actions: actions() } })
        const timelineCalls = () => invoke.mock.calls.filter(([command]) => command === "media_session_timeline").length
        const before = timelineCalls()
        rerender({ ...base, playing: true, position: 0.25, actions: actions() })
        rerender({ ...base, playing: true, position: 0.5, actions: actions() })
        expect(timelineCalls()).toBe(before)
        rerender({ ...base, playing: true, position: 1.1, actions: actions() })
        expect(timelineCalls()).toBe(before + 1)
    })

    it("runs the actions asked by the system", async () => {
        const run = actions()
        renderHook(() => useMediaSession({ ...base, actions: run }))
        await vi.waitFor(() => expect(emit).toBeDefined())

        emit!({ payload: { action: "play" } })
        emit!({ payload: { action: "pause" } })
        emit!({ payload: { action: "stop" } })
        emit!({ payload: { action: "seekbackward" } })
        emit!({ payload: { action: "seekforward" } })
        emit!({ payload: { action: "seekto", seekTime: 42 } })

        expect(run.play).toHaveBeenCalled()
        expect(run.pause).toHaveBeenCalled()
        expect(run.stop).toHaveBeenCalled()
        expect(run.seekBackward).toHaveBeenCalled()
        expect(run.seekForward).toHaveBeenCalled()
        expect(run.seekTo).toHaveBeenCalledWith(42)
    })

    it("removes the session and stops listening when the player goes away", async () => {
        const { unmount } = renderHook(() => useMediaSession({ ...base, actions: actions() }))
        await vi.waitFor(() => expect(emit).toBeDefined())
        unmount()
        expect(unlisten).toHaveBeenCalled()
        expect(invoke).toHaveBeenCalledWith("media_session_clear")
    })

    it("leaves navigator.mediaSession alone", () => {
        const session = { metadata: null, playbackState: "none", setActionHandler: vi.fn() }
        Object.defineProperty(navigator, "mediaSession", { value: session, configurable: true })
        try {
            renderHook(() => useMediaSession({ ...base, actions: actions() }))
            expect(session.setActionHandler).not.toHaveBeenCalled()
            expect(session.metadata).toBeNull()
        } finally {
            Reflect.deleteProperty(navigator, "mediaSession")
        }
    })
})

describe("useMediaSession elsewhere", () => {
    it("does not call the backend outside of Windows", () => {
        tauri = true
        invoke.mockClear()
        Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (X11; Linux x86_64)", configurable: true })
        renderHook(() => useMediaSession({ ...base, actions: actions() }))
        expect(invoke).not.toHaveBeenCalled()
    })
})
