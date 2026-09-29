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

    it("hides the player and pauses when closed", async () => {
        const user = userEvent.setup()
        const { container } = setup()
        const closeIcon = container.querySelector("svg.lucide-x")!
        await user.click(closeIcon.parentElement!)

        expect(pause).toHaveBeenCalled()
        expect(container.firstElementChild).toHaveClass("hidden")
    })
})
