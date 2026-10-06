import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { DraggableAudioPlayer } from "./draggable-audio-player"

const reportAudioPlayerSize = vi.fn()
let observerCallback: (() => void) | null = null

vi.mock("@dnd-kit/core", () => ({
    useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null }),
}))
vi.mock("./audio-player", () => ({ AudioPlayer: () => <div /> }))
vi.mock("@/hooks/use-shortcut", () => ({ useShortcut: vi.fn() }))
vi.mock("@/contexts/use-audio", () => ({
    useAudio: () => ({
        track: { src: "a.mp3", name: "a", playId: 1 },
        closePlayer: vi.fn(), reportPlaybackError: vi.fn(), toggleSeq: 0, setPlaybackState: vi.fn(), togglePlayback: vi.fn(),
    }),
}))
vi.mock("@/contexts/use-preferences", () => ({
    usePreferences: () => ({
        audioVolume: 1, setAudioVolume: vi.fn(), audioPlayerVisible: true, audioPlayerScale: 1, audioPlayerOpacity: 1, reportAudioPlayerSize,
    }),
}))

describe("DraggableAudioPlayer", () => {
    beforeEach(() => {
        reportAudioPlayerSize.mockClear()
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
})
