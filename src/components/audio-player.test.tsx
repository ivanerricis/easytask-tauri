import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AudioPlayer } from "./audio-player"

const attributes = {
    role: "button",
    tabIndex: 0,
    "aria-disabled": false,
    "aria-pressed": undefined,
    "aria-roledescription": "draggable",
    "aria-describedby": "x",
} as const

const setup = () => {
    const utils = render(<AudioPlayer src="a.mp3" fileName="song.mp3" listenersHandle={undefined} attributesHandle={attributes} />)
    const audio = utils.container.querySelector("audio") as HTMLAudioElement
    return { ...utils, audio }
}

// The play/pause button is the only one holding a lucide play/pause icon
const playButton = () => screen.getAllByRole("button").find(b => b.querySelector("svg.lucide-play, svg.lucide-pause"))!

describe("AudioPlayer", () => {
    let play: ReturnType<typeof vi.fn>
    let pause: ReturnType<typeof vi.fn>

    beforeEach(() => {
        play = vi.fn().mockImplementation(function (this: HTMLMediaElement) {
            this.dispatchEvent(new Event("play"))
            return Promise.resolve()
        })
        pause = vi.fn().mockImplementation(function (this: HTMLMediaElement) {
            this.dispatchEvent(new Event("pause"))
        })
        vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play as never)
        vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause as never)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("shows the file name and starts paused", () => {
        setup()
        expect(screen.getByText("song.mp3")).toBeInTheDocument()
        expect(playButton().querySelector("svg.lucide-play")).not.toBeNull()
    })

    it("toggles between play and pause", async () => {
        const user = userEvent.setup()
        setup()

        await user.click(playButton())
        expect(play).toHaveBeenCalledTimes(1)
        expect(playButton().querySelector("svg.lucide-pause")).not.toBeNull()

        await user.click(playButton())
        expect(pause).toHaveBeenCalledTimes(1)
        expect(playButton().querySelector("svg.lucide-play")).not.toBeNull()
    })

    it("resets isPlaying when the track ends", async () => {
        const user = userEvent.setup()
        const { audio } = setup()
        await user.click(playButton())
        expect(playButton().querySelector("svg.lucide-pause")).not.toBeNull()

        fireEvent.ended(audio)
        expect(playButton().querySelector("svg.lucide-play")).not.toBeNull()
    })

    it("handles a rejected play() without crashing and stays paused", async () => {
        const user = userEvent.setup()
        play.mockImplementation(() => Promise.reject(new Error("NotAllowedError")))
        setup()

        await user.click(playButton())
        await waitFor(() => expect(play).toHaveBeenCalled())
        expect(playButton().querySelector("svg.lucide-play")).not.toBeNull()
    })

    it("updates the time labels from media events", () => {
        const { audio } = setup()
        Object.defineProperty(audio, "duration", { value: 125, configurable: true })
        Object.defineProperty(audio, "currentTime", { value: 65, configurable: true, writable: true })

        act(() => {
            audio.dispatchEvent(new Event("loadedmetadata"))
            audio.dispatchEvent(new Event("timeupdate"))
        })

        expect(screen.getByText("2:05")).toBeInTheDocument()
        expect(screen.getByText("1:05")).toBeInTheDocument()
    })

    it("seeks by writing currentTime on the audio element", () => {
        const { audio } = setup()
        // The seek range is clamped to the duration, so load it first
        Object.defineProperty(audio, "duration", { value: 100, configurable: true })
        act(() => { audio.dispatchEvent(new Event("loadedmetadata")) })
        fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "42" } })
        expect(audio.currentTime).toBe(42)
    })

    it("changes the volume", () => {
        const { audio } = setup()
        const volume = screen.getAllByRole("slider")[1]
        fireEvent.change(volume, { target: { value: "0.5" } })
        expect(audio.volume).toBe(0.5)
        expect(screen.getByText("50")).toBeInTheDocument()
    })

    it("starts from the volume preference and follows it when it changes", () => {
        const props = { src: "a.mp3", listenersHandle: undefined, attributesHandle: attributes } as const
        const { container, rerender } = render(<AudioPlayer {...props} volume={0.3} />)
        const audio = container.querySelector("audio") as HTMLAudioElement
        expect(audio.volume).toBe(0.3)
        expect(screen.getByText("30")).toBeInTheDocument()
        expect(screen.getByLabelText("Volume")).toHaveAttribute("aria-valuetext", "30%")

        rerender(<AudioPlayer {...props} volume={0.8} />)
        expect(audio.volume).toBe(0.8)
        expect(screen.getByText("80")).toBeInTheDocument()
    })

    it("reports the volume the user sets", () => {
        const onVolumeChange = vi.fn()
        render(<AudioPlayer src="a.mp3" listenersHandle={undefined} attributesHandle={attributes} volume={1} onVolumeChange={onVolumeChange} />)
        fireEvent.change(screen.getByLabelText("Volume"), { target: { value: "0.25" } })
        expect(onVolumeChange).toHaveBeenCalledWith(0.25)
    })

    it("pauses and calls onClose when closed", async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        render(<AudioPlayer src="a.mp3" fileName="song.mp3" listenersHandle={undefined} attributesHandle={attributes} onClose={onClose} />)
        await user.click(screen.getByLabelText("Chiudi il player"))

        expect(pause).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("is hidden when open is false", () => {
        const { container } = render(<AudioPlayer src="a.mp3" listenersHandle={undefined} attributesHandle={attributes} open={false} />)
        expect(container.firstElementChild).toHaveClass("hidden")
    })

    it("starts from the beginning when autoPlayKey changes, not otherwise", () => {
        const props = { src: "a.mp3", listenersHandle: undefined, attributesHandle: attributes } as const
        const { rerender } = render(<AudioPlayer {...props} />)
        expect(play).not.toHaveBeenCalled()

        rerender(<AudioPlayer {...props} autoPlayKey={1} />)
        expect(play).toHaveBeenCalledTimes(1)
        rerender(<AudioPlayer {...props} autoPlayKey={1} />)
        expect(play).toHaveBeenCalledTimes(1)
        rerender(<AudioPlayer {...props} autoPlayKey={2} />)
        expect(play).toHaveBeenCalledTimes(2)
    })

    it("reports media errors", () => {
        const onError = vi.fn()
        const { container } = render(<AudioPlayer src="a.mp3" listenersHandle={undefined} attributesHandle={attributes} onError={onError} />)
        fireEvent.error(container.querySelector("audio")!)
        expect(onError).toHaveBeenCalledTimes(1)
    })

    describe("layout", () => {
        it("shows the title in a row of its own, with the whole name as tooltip", () => {
            const name = "Quavo & Takeoff - HOTEL LOBBY _ A COLORS SHOW_320k.mp3"
            render(<AudioPlayer src="a.mp3" fileName={name} listenersHandle={undefined} attributesHandle={attributes} />)
            const title = screen.getByText(name)
            expect(title).toHaveAttribute("title", name)
            expect(title).toHaveClass("line-clamp-2")
            // Not in the row of the play button or in the row of the seek bar
            expect(title.parentElement).not.toContainElement(playButton())
            expect(title.parentElement).not.toContainElement(screen.getByRole("slider", { name: "Posizione di riproduzione" }))
        })

        it("uses the same handle as the groups", () => {
            const { container } = render(<AudioPlayer src="a.mp3" listenersHandle={undefined} attributesHandle={attributes} />)
            expect(container.querySelector("svg.lucide-grip")).not.toBeNull()
            expect(container.querySelector("svg.lucide-grip-vertical")).toBeNull()
        })
    })

    describe("pause and resume on request", () => {
        const props = { src: "a.mp3", listenersHandle: undefined, attributesHandle: attributes } as const

        it("toggles when toggleKey changes, not otherwise", () => {
            const { rerender } = render(<AudioPlayer {...props} toggleKey={0} />)
            rerender(<AudioPlayer {...props} toggleKey={0} />)
            expect(play).not.toHaveBeenCalled()

            rerender(<AudioPlayer {...props} toggleKey={1} />)
            expect(play).toHaveBeenCalledTimes(1)
            rerender(<AudioPlayer {...props} toggleKey={1} />)
            expect(pause).not.toHaveBeenCalled()
            rerender(<AudioPlayer {...props} toggleKey={2} />)
            expect(pause).toHaveBeenCalledTimes(1)
        })

        it("does not toggle on mount, even with a non zero toggleKey", () => {
            render(<AudioPlayer {...props} toggleKey={7} />)
            expect(play).not.toHaveBeenCalled()
            expect(pause).not.toHaveBeenCalled()
        })

        it("reports when it starts playing, is paused and plays to the end", async () => {
            const onStateChange = vi.fn()
            const user = userEvent.setup()
            const { container } = render(<AudioPlayer {...props} onStateChange={onStateChange} />)
            const audio = container.querySelector("audio") as HTMLAudioElement
            expect(onStateChange).toHaveBeenLastCalledWith("paused")
            await user.click(playButton())
            expect(onStateChange).toHaveBeenLastCalledWith("playing")
            await user.click(playButton())
            expect(onStateChange).toHaveBeenLastCalledWith("paused")

            await user.click(playButton())
            fireEvent.ended(audio)
            expect(onStateChange).toHaveBeenLastCalledWith("ended")
        })

        it("is not ended any more once it plays again, is moved back or another track is loaded", async () => {
            const onStateChange = vi.fn()
            const user = userEvent.setup()
            const { container } = render(<AudioPlayer {...props} onStateChange={onStateChange} />)
            const audio = container.querySelector("audio") as HTMLAudioElement

            fireEvent.ended(audio)
            expect(onStateChange).toHaveBeenLastCalledWith("ended")
            await user.click(playButton())
            expect(onStateChange).toHaveBeenLastCalledWith("playing")

            await user.click(playButton())
            fireEvent.ended(audio)
            expect(onStateChange).toHaveBeenLastCalledWith("ended")
            fireEvent.seeked(audio)
            expect(onStateChange).toHaveBeenLastCalledWith("paused")

            fireEvent.ended(audio)
            expect(onStateChange).toHaveBeenLastCalledWith("ended")
            fireEvent(audio, new Event("emptied"))
            expect(onStateChange).toHaveBeenLastCalledWith("paused")
        })
    })

    describe("keyboard", () => {
        const loaded = (duration = 100, at = 50) => {
            const utils = setup()
            Object.defineProperty(utils.audio, "duration", { value: duration, configurable: true })
            Object.defineProperty(utils.audio, "currentTime", { value: at, configurable: true, writable: true })
            act(() => { utils.audio.dispatchEvent(new Event("loadedmetadata")); utils.audio.dispatchEvent(new Event("timeupdate")) })
            return utils
        }

        it("moves the seek bar by 5 seconds with the arrows (not by the 0.1 s step of the range)", () => {
            const { audio } = loaded()
            const seek = screen.getByRole("slider", { name: "Posizione di riproduzione" })
            fireEvent.keyDown(seek, { key: "ArrowRight" })
            expect(audio.currentTime).toBe(55)
            fireEvent.keyDown(seek, { key: "ArrowUp" })
            expect(audio.currentTime).toBe(60)
            fireEvent.keyDown(seek, { key: "ArrowLeft" })
            fireEvent.keyDown(seek, { key: "ArrowDown" })
            expect(audio.currentTime).toBe(50)
        })

        it("stays between the start and the end of the track", () => {
            const { audio } = loaded(100, 3)
            const seek = screen.getByRole("slider", { name: "Posizione di riproduzione" })
            fireEvent.keyDown(seek, { key: "ArrowLeft" })
            expect(audio.currentTime).toBe(0)
            Object.defineProperty(audio, "currentTime", { value: 98, configurable: true, writable: true })
            fireEvent.keyDown(seek, { key: "ArrowRight" })
            expect(audio.currentTime).toBe(100)
        })

        it("plays and pauses with the space bar on the seek bar and on the volume bar", () => {
            loaded()
            fireEvent.keyDown(screen.getByRole("slider", { name: "Posizione di riproduzione" }), { key: " " })
            expect(play).toHaveBeenCalledTimes(1)
            fireEvent.keyDown(screen.getByRole("slider", { name: "Volume" }), { key: " " })
            expect(pause).toHaveBeenCalledTimes(1)
        })

        it("tells the position in words", () => {
            loaded(125, 65)
            expect(screen.getByRole("slider", { name: "Posizione di riproduzione" })).toHaveAttribute("aria-valuetext", "1:05 di 2:05")
        })
    })

    it("shows hours from one hour on", () => {
        const { audio } = setup()
        Object.defineProperty(audio, "duration", { value: 3725, configurable: true })
        Object.defineProperty(audio, "currentTime", { value: 3605, configurable: true, writable: true })
        act(() => { audio.dispatchEvent(new Event("loadedmetadata")); audio.dispatchEvent(new Event("timeupdate")) })
        expect(screen.getByText("1:02:05")).toBeInTheDocument()
        expect(screen.getByText("1:00:05")).toBeInTheDocument()
    })

    describe("mute and speed", () => {
        it("mutes only the player: the saved volume is not touched, and moving the slider unmutes", async () => {
            const onVolumeChange = vi.fn()
            const user = userEvent.setup()
            const { container } = render(<AudioPlayer src="a.mp3" listenersHandle={undefined} attributesHandle={attributes} onVolumeChange={onVolumeChange} />)
            const audio = container.querySelector("audio") as HTMLAudioElement

            await user.click(screen.getByRole("button", { name: "Silenzia" }))
            expect(audio.muted).toBe(true)
            expect(screen.getByRole("button", { name: "Riattiva l'audio" })).toHaveAttribute("aria-pressed", "true")
            expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-valuetext", "0%")
            expect(onVolumeChange).not.toHaveBeenCalled()

            fireEvent.change(screen.getByRole("slider", { name: "Volume" }), { target: { value: "0.4" } })
            expect(audio.muted).toBe(false)
            expect(audio.volume).toBe(0.4)
            expect(onVolumeChange).toHaveBeenCalledWith(0.4)
            expect(screen.getByRole("button", { name: "Silenzia" })).toHaveAttribute("aria-pressed", "false")
        })

        it("unmutes with the same button and brings the volume back", async () => {
            const user = userEvent.setup()
            const { audio } = setup()
            await user.click(screen.getByRole("button", { name: "Silenzia" }))
            await user.click(screen.getByRole("button", { name: "Riattiva l'audio" }))
            expect(audio.muted).toBe(false)
            expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-valuetext", "100%")
        })

        it("cycles the playback speed and applies it, also as the default of the next track", async () => {
            const user = userEvent.setup()
            const { audio } = setup()
            const speed = () => screen.getByRole("button", { name: /Velocità di riproduzione/ })
            expect(speed()).toHaveTextContent("1×")

            const seen: string[] = []
            for (let i = 0; i < 5; i++) {
                await user.click(speed())
                seen.push(speed().textContent ?? "")
            }
            expect(seen).toEqual(["1.25×", "1.5×", "2×", "0.75×", "1×"])

            await user.click(speed())
            await user.click(speed())
            expect(audio.playbackRate).toBe(1.5)
            expect(audio.defaultPlaybackRate).toBe(1.5)
            expect(speed()).toHaveAccessibleName("Velocità di riproduzione: 1.5×")
        })
    })

    describe("system media controls", () => {
        type Handler = ((details: { seekTime?: number, seekOffset?: number }) => void) | null
        let handlers: Record<string, Handler>
        let session: { metadata: unknown, playbackState: string, setActionHandler: (action: string, handler: Handler) => void }

        beforeEach(() => {
            handlers = {}
            session = { metadata: null, playbackState: "none", setActionHandler: (action, handler) => { handlers[action] = handler } }
            Object.defineProperty(navigator, "mediaSession", { value: session, configurable: true })
            vi.stubGlobal("MediaMetadata", class { title: string; artist: string; constructor(init: { title: string, artist: string }) { this.title = init.title; this.artist = init.artist } })
        })

        afterEach(() => {
            Reflect.deleteProperty(navigator, "mediaSession")
            vi.unstubAllGlobals()
        })

        it("publishes the title and the playback state", async () => {
            const user = userEvent.setup()
            setup()
            expect(session.metadata).toMatchObject({ title: "song.mp3", artist: "EasyTask" })
            expect(session.playbackState).toBe("paused")
            await user.click(playButton())
            expect(session.playbackState).toBe("playing")
        })

        it("lets the system play, pause, seek and stop the player", () => {
            const onClose = vi.fn()
            const utils = render(<AudioPlayer src="a.mp3" fileName="song.mp3" listenersHandle={undefined} attributesHandle={attributes} onClose={onClose} />)
            const audio = utils.container.querySelector("audio") as HTMLAudioElement
            Object.defineProperty(audio, "currentTime", { value: 30, configurable: true, writable: true })

            act(() => handlers.play?.({}))
            expect(play).toHaveBeenCalledTimes(1)
            act(() => handlers.pause?.({}))
            expect(pause).toHaveBeenCalledTimes(1)
            act(() => handlers.seekto?.({ seekTime: 12 }))
            expect(audio.currentTime).toBe(12)
            act(() => handlers.seekforward?.({}))
            expect(audio.currentTime).toBe(22)
            act(() => handlers.seekbackward?.({ seekOffset: 5 }))
            expect(audio.currentTime).toBe(17)
            act(() => handlers.stop?.({}))
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it("lets go of the system controls when the player closes", () => {
            const { unmount } = setup()
            expect(handlers.play).toBeTypeOf("function")
            unmount()
            expect(handlers.play).toBeNull()
            expect(handlers.seekto).toBeNull()
            expect(session.metadata).toBeNull()
            expect(session.playbackState).toBe("none")
        })
    })

    describe("restart and the progress bar", () => {
        const loadedAt = (at: number, duration = 100) => {
            const utils = setup()
            Object.defineProperty(utils.audio, "duration", { value: duration, configurable: true })
            Object.defineProperty(utils.audio, "currentTime", { value: at, configurable: true, writable: true })
            act(() => { utils.audio.dispatchEvent(new Event("loadedmetadata")); utils.audio.dispatchEvent(new Event("timeupdate")) })
            return utils
        }

        it("starts the track over from the beginning and plays, also when it is paused", async () => {
            const user = userEvent.setup()
            const { audio } = loadedAt(42)
            expect(screen.getByText("0:42")).toBeInTheDocument()

            await user.click(screen.getByRole("button", { name: "Riparti dall'inizio" }))

            expect(audio.currentTime).toBe(0)
            expect(play).toHaveBeenCalledTimes(1)
            expect(screen.getByText("0:00")).toBeInTheDocument()
            expect(playButton().querySelector("svg.lucide-pause")).not.toBeNull()
        })

        it("restarts a track that is playing without pausing it", async () => {
            const user = userEvent.setup()
            const { audio } = loadedAt(10)
            await user.click(playButton())
            audio.currentTime = 30

            await user.click(screen.getByRole("button", { name: "Riparti dall'inizio" }))

            expect(audio.currentTime).toBe(0)
            expect(pause).not.toHaveBeenCalled()
            expect(playButton().querySelector("svg.lucide-pause")).not.toBeNull()
        })

        it("fills the seek bar from the left edge up to the position, whatever its width", () => {
            const seek = () => screen.getByRole("slider", { name: "Posizione di riproduzione" })
            const { audio } = loadedAt(0)
            expect(seek().style.getPropertyValue("--range-progress")).toBe("0")

            for (const [at, progress] of [[25, "0.25"], [50, "0.5"], [96, "0.96"], [100, "1"]] as const) {
                Object.defineProperty(audio, "currentTime", { value: at, configurable: true, writable: true })
                act(() => { audio.dispatchEvent(new Event("timeupdate")) })
                expect(seek().style.getPropertyValue("--range-progress")).toBe(progress)
            }
        })

        it("leaves the seek bar empty while the duration is not known yet", () => {
            setup()
            expect(screen.getByRole("slider", { name: "Posizione di riproduzione" }).style.getPropertyValue("--range-progress")).toBe("0")
        })

        it("fills the volume bar from the volume", () => {
            setup()
            fireEvent.change(screen.getByRole("slider", { name: "Volume" }), { target: { value: "0.3" } })
            expect(screen.getByRole("slider", { name: "Volume" }).style.getPropertyValue("--range-progress")).toBe("0.3")
        })
    })
})
