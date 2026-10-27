import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { DraggableAudioPlayer } from "./draggable-audio-player"

const reportAudioPlayerSize = vi.fn()
let observerCallback: (() => void) | null = null

const useDraggable = vi.fn<(options: { id: string, disabled?: boolean }) => unknown>(() => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null }))
const setAudioPlayerPinned = vi.fn()
let pinned = false
let playerProps: { pinned?: boolean, onPinnedChange?: (pinned: boolean) => void } = {}

vi.mock("@dnd-kit/core", () => ({
    useDraggable: (options: { id: string, disabled?: boolean }) => useDraggable(options),
}))
vi.mock("./audio-player", () => ({ AudioPlayer: (props: typeof playerProps) => { playerProps = props; return <div /> } }))
vi.mock("@/hooks/use-shortcut", () => ({ useShortcut: vi.fn() }))
vi.mock("@/contexts/use-audio", () => ({
    useAudio: () => ({
        track: { src: "a.mp3", name: "a", playId: 1 },
        closePlayer: vi.fn(), reportPlaybackError: vi.fn(), toggleSeq: 0, setPlaybackState: vi.fn(), togglePlayback: vi.fn(),
    }),
}))
vi.mock("@/contexts/use-preferences", () => ({
    usePreferences: () => ({
        audioVolume: 1, setAudioVolume: vi.fn(), audioPlayerVisible: true, audioPlayerPinned: pinned, setAudioPlayerPinned, audioPlayerScale: 1, audioPlayerOpacity: 1, reportAudioPlayerSize,
    }),
}))

describe("DraggableAudioPlayer", () => {
    beforeEach(() => {
        reportAudioPlayerSize.mockClear()
        useDraggable.mockClear()
        setAudioPlayerPinned.mockClear()
        pinned = false
        vi.stubGlobal("ResizeObserver", class {
            constructor(cb: () => void) { observerCallback = cb }
            observe() { }
            disconnect() { }
        })
        vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(350)
        vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(130)
    })
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it("reports its real size on mount and when it resizes, and null on unmount", () => {
        const { unmount } = render(<DraggableAudioPlayer position={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }} />)
        expect(reportAudioPlayerSize).toHaveBeenLastCalledWith({ width: 350, height: 130 })

        vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(160)
        observerCallback?.()
        expect(reportAudioPlayerSize).toHaveBeenLastCalledWith({ width: 350, height: 160 })

        unmount()
        expect(reportAudioPlayerSize).toHaveBeenLastCalledWith(null)
    })

    it("is draggable while not pinned", () => {
        render(<DraggableAudioPlayer position={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }} />)
        expect(useDraggable).toHaveBeenLastCalledWith({ id: "audio-player", disabled: false })
        expect(playerProps.pinned).toBe(false)
    })

    it("disables the drag when pinned and passes the pin to the player", () => {
        pinned = true
        render(<DraggableAudioPlayer position={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }} />)
        expect(useDraggable).toHaveBeenLastCalledWith({ id: "audio-player", disabled: true })
        expect(playerProps.pinned).toBe(true)
        playerProps.onPinnedChange?.(false)
        expect(setAudioPlayerPinned).toHaveBeenCalledWith(false)
    })
})
