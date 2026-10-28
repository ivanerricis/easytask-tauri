import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AudioPlayer } from "./audio-player"
import { forgetPosition, getResumePosition, rememberPosition } from "@/lib/audio-positions"

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

vi.mock("@/lib/audio-positions", () => ({
    POSITION_SAVE_INTERVAL_MS: 3000,
    getResumePosition: vi.fn(),
    rememberPosition: vi.fn(() => Promise.resolve()),
    forgetPosition: vi.fn(() => Promise.resolve()),
}))

const attributes = {
    role: "button", tabIndex: 0, "aria-disabled": false, "aria-pressed": undefined, "aria-roledescription": "draggable", "aria-describedby": "x",
} as const

type Extra = Partial<React.ComponentProps<typeof AudioPlayer>>
const ui = (extra: Extra = {}) => <AudioPlayer src="a.mp3" fileName="song.mp3" listenersHandle={undefined} attributesHandle={attributes} {...extra} />

/** jsdom does not play anything: the element reports what the test says. */
const fakeMedia = (audio: HTMLAudioElement, state: { time: number, duration: number, paused: boolean, ended: boolean }) => {
    Object.defineProperty(audio, "currentTime", { configurable: true, get: () => state.time, set: (value: number) => { state.time = value } })
    Object.defineProperty(audio, "duration", { configurable: true, get: () => state.duration })
    Object.defineProperty(audio, "paused", { configurable: true, get: () => state.paused })
    Object.defineProperty(audio, "ended", { configurable: true, get: () => state.ended })
}

describe("AudioPlayer: repeat, speed and resume", () => {
    let play: ReturnType<typeof vi.fn>

    beforeEach(() => {
        play = vi.fn().mockResolvedValue(undefined)
        vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play as never)
        vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined)
        vi.mocked(getResumePosition).mockReset()
        vi.mocked(rememberPosition).mockClear()
        vi.mocked(forgetPosition).mockClear()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("loops the track only when repeat is on, so it never reaches the ended state", () => {
        const { container, rerender } = render(ui())
        const audio = container.querySelector("audio") as HTMLAudioElement
        expect(audio.loop).toBe(false)
        rerender(ui({ repeat: true }))
        expect(audio.loop).toBe(true)
    })

    it("starts at the remembered speed, follows it from outside and reports a change", async () => {
        const user = userEvent.setup()
        const onPlaybackRateChange = vi.fn()
        const { container, rerender } = render(ui({ playbackRate: 1.5, onPlaybackRateChange }))
        const audio = container.querySelector("audio") as HTMLAudioElement
        expect(audio.playbackRate).toBe(1.5)
        expect(audio.defaultPlaybackRate).toBe(1.5)
        expect(screen.getByRole("button", { name: /1\.5/ })).toHaveTextContent("1.5×")

        await user.click(screen.getByRole("button", { name: /1\.5/ }))
        expect(onPlaybackRateChange).toHaveBeenCalledWith(2)
        expect(audio.playbackRate).toBe(2)

        // The saved speed arrives after the first render
        rerender(ui({ playbackRate: 0.75, onPlaybackRateChange }))
        expect(audio.playbackRate).toBe(0.75)
    })

    it("starts from the beginning when it must not resume", () => {
        const { container } = render(ui({ autoPlayKey: 1, audioId: 7 }))
        const audio = container.querySelector("audio") as HTMLAudioElement
        expect(audio.currentTime).toBe(0)
        expect(play).toHaveBeenCalled()
        expect(getResumePosition).not.toHaveBeenCalled()
    })

    it("resumes from the remembered position when asked to", async () => {
        vi.mocked(getResumePosition).mockResolvedValue(42)
        const { container } = render(ui({ autoPlayKey: 1, audioId: 7, resume: true }))
        const audio = container.querySelector("audio") as HTMLAudioElement
        await waitFor(() => expect(play).toHaveBeenCalled())
        expect(getResumePosition).toHaveBeenCalledWith(7, expect.anything())
        expect(audio.currentTime).toBe(42)
    })

    it("starts from the beginning when nothing is remembered (or it is near the edges)", async () => {
        vi.mocked(getResumePosition).mockResolvedValue(0)
        const { container } = render(ui({ autoPlayKey: 1, audioId: 7, resume: true }))
        const audio = container.querySelector("audio") as HTMLAudioElement
        await waitFor(() => expect(play).toHaveBeenCalled())
        expect(audio.currentTime).toBe(0)
    })

    it("does not start a track that was replaced while its position was being read", async () => {
        let answer: (value: number) => void = () => undefined
        vi.mocked(getResumePosition).mockReturnValue(new Promise(resolve => { answer = resolve }))
        const { rerender } = render(ui({ autoPlayKey: 1, audioId: 7, resume: true }))
        vi.mocked(getResumePosition).mockResolvedValue(0)
        rerender(ui({ src: "b.mp3", autoPlayKey: 2, audioId: 8, resume: true }))
        await waitFor(() => expect(play).toHaveBeenCalledTimes(1))
        await act(async () => { answer(50) })
        expect(play).toHaveBeenCalledTimes(1)
    })

    describe("saving the position", () => {
        let now: number
        beforeEach(() => {
            now = 1_000_000
            vi.spyOn(Date, "now").mockImplementation(() => now)
        })

        const setupResume = (resume = true) => {
            const state = { time: 0, duration: 300, paused: false, ended: false }
            const utils = render(ui({ audioId: 7, resume }))
            const audio = utils.container.querySelector("audio") as HTMLAudioElement
            fakeMedia(audio, state)
            return { ...utils, audio, state }
        }

        it("saves at most every 3 seconds while playing", () => {
            const { audio, state } = setupResume()
            state.time = 20
            now += 1000
            fireEvent(audio, new Event("timeupdate"))
            expect(rememberPosition).not.toHaveBeenCalled()
            state.time = 23
            now += 2500
            fireEvent(audio, new Event("timeupdate"))
            expect(rememberPosition).toHaveBeenCalledTimes(1)
            expect(rememberPosition).toHaveBeenLastCalledWith(7, 23, 300)
            state.time = 24
            now += 500
            fireEvent(audio, new Event("timeupdate"))
            expect(rememberPosition).toHaveBeenCalledTimes(1)
        })

        it("saves at once when paused, but forgets the position when the track ended", () => {
            const { audio, state } = setupResume()
            state.time = 90
            state.paused = true
            fireEvent(audio, new Event("pause"))
            expect(rememberPosition).toHaveBeenLastCalledWith(7, 90, 300)

            state.time = 300
            state.ended = true
            fireEvent(audio, new Event("pause"))
            expect(forgetPosition).toHaveBeenCalledWith(7)
            fireEvent(audio, new Event("ended"))
            expect(forgetPosition).toHaveBeenCalledTimes(2)
        })

        it("saves the last position when the player closes", () => {
            const { audio, state, unmount } = setupResume()
            state.time = 61
            fireEvent(audio, new Event("timeupdate"))
            unmount()
            expect(rememberPosition).toHaveBeenLastCalledWith(7, 61, 300)
        })

        it("saves the position of the old track when another one replaces it", () => {
            const { audio, state, rerender } = setupResume()
            state.time = 61
            fireEvent(audio, new Event("timeupdate"))
            rerender(ui({ src: "b.mp3", audioId: 8, resume: true }))
            expect(rememberPosition).toHaveBeenLastCalledWith(7, 61, 300)
        })

        it("remembers nothing when resume is off", () => {
            const { audio, state, unmount } = setupResume(false)
            state.time = 61
            now += 10_000
            fireEvent(audio, new Event("timeupdate"))
            fireEvent(audio, new Event("pause"))
            fireEvent(audio, new Event("ended"))
            unmount()
            expect(rememberPosition).not.toHaveBeenCalled()
            expect(forgetPosition).not.toHaveBeenCalled()
        })
    })
})
