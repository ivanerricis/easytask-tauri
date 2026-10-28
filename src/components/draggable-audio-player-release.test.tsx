import { useLayoutEffect, useState } from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { DndContext, useDndContext, type DragEndEvent } from "@dnd-kit/core"
import { describe, it, expect, vi, beforeAll } from "vitest"
import { restrictToParentElement } from "@dnd-kit/modifiers"
import { AUDIO_PLAYER_MEASURING } from "@/lib/audio-player-dnd"
import { DraggableAudioPlayer } from "./draggable-audio-player"

type Props = { listenersHandle?: Record<string, unknown>, attributesHandle?: Record<string, unknown> }

vi.mock("./audio-player", () => ({
    AudioPlayer: ({ listenersHandle, attributesHandle }: Props) => <div data-testid="handle" {...listenersHandle} {...attributesHandle} />,
}))
vi.mock("@/hooks/use-shortcut", () => ({ useShortcut: vi.fn() }))
vi.mock("@/contexts/use-audio", () => ({
    useAudio: () => ({
        track: { src: "a.mp3", name: "a", playId: 1 },
        closePlayer: vi.fn(), reportPlaybackError: vi.fn(), toggleSeq: 0, setPlaybackState: vi.fn(), togglePlayback: vi.fn(),
    }),
}))
vi.mock("@/contexts/use-preferences", () => ({
    usePreferences: () => ({
        audioVolume: 1, setAudioVolume: vi.fn(), audioPlayerVisible: true, audioPlayerPinned: false, setAudioPlayerPinned: vi.fn(),
        audioPlayerScale: 1, audioPlayerOpacity: 1, reportAudioPlayerSize: vi.fn(),
    }),
}))

/** Every committed state of the player box: its position and the transform of the drag. */
const commits: { top: string, left: string, transform: string }[] = []

const Host = () => {
    const [position, setPosition] = useState({ x: 10, y: 20, scaleX: 1, scaleY: 1 })
    // Same as MainContainer: the new position is the old one plus the delta of the drag
    const onDragEnd = (event: DragEndEvent) => setPosition({ ...position, x: position.x + event.delta.x, y: position.y + event.delta.y })
    return (
        <DndContext onDragEnd={onDragEnd}>
            <DraggableAudioPlayer position={position} />
            <Probe position={position} />
        </DndContext>
    )
}

/** Rendered after the player: its layout effect runs at the end of every commit, before the browser can paint. */
const Probe = ({ position }: { position: unknown }) => {
    // Re-renders with the context of the drag (its translate) and with the position of the host
    useDndContext()
    useLayoutEffect(() => {
        void position
        const box = document.querySelector<HTMLElement>('[data-testid="audio-player-frame"]')?.parentElement
        if (box) commits.push({ top: box.style.top, left: box.style.left, transform: box.style.transform })
    })
    return null
}

describe("DraggableAudioPlayer release", () => {
    beforeAll(() => {
        // jsdom has no PointerEvent: the sensor of dnd-kit needs the coordinates
        class FakePointerEvent extends MouseEvent {
            pointerId: number
            isPrimary = true
            constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
                super(type, init)
                this.pointerId = init.pointerId ?? 1
            }
        }
        vi.stubGlobal("PointerEvent", FakePointerEvent)
    })

    const tick = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) })

    it("rests at its position with the transform alone, top and left stay 0", () => {
        const { getByTestId } = render(<Host />)
        const box = getByTestId("audio-player-frame").parentElement as HTMLElement
        expect(box.style.transform).toBe("translate3d(10px, 20px, 0)")
        expect(box.style.top).toBe("0px")
        expect(box.style.left).toBe("0px")
        expect(box.style.willChange).toBe("transform")
    })

    it("never commits the old translate without the drag, and the release commits the final translate3d", async () => {
        const { getByTestId } = render(<Host />)
        const handle = getByTestId("handle")
        commits.length = 0

        fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, button: 0, isPrimary: true })
        await tick()
        fireEvent(document, new PointerEvent("pointermove", { clientX: 40, clientY: 30, bubbles: true }))
        await tick()
        const afterFirstMove = commits.length
        fireEvent(document, new PointerEvent("pointermove", { clientX: 100, clientY: 50, bubbles: true }))
        await tick()
        const dragging = commits.length
        expect(commits[dragging - 1].transform).toBe("translate3d(110px, 70px, 0)")
        // While dragging the translate already follows the pointer
        for (const state of commits.slice(afterFirstMove - 1)) expect(state.transform).not.toBe("translate3d(10px, 20px, 0)")
        fireEvent(document, new PointerEvent("pointerup", { clientX: 100, clientY: 50, bubbles: true }))
        await tick()

        const release = commits.slice(dragging)
        expect(release.length).toBeGreaterThan(0)
        for (const state of release) {
            // The drag delta leaves together with the new position: the translate is the same one before and after the drop
            expect(state.transform).toBe("translate3d(110px, 70px, 0)")
            expect(state).toMatchObject({ left: "0px", top: "0px" })
        }
        for (const state of commits) expect(state).toMatchObject({ left: "0px", top: "0px" })
    })

    it("keeps the player inside its container when it is dragged past the edge (restrictToParentElement with the visual measure)", async () => {
        const rectOf = (left: number, top: number, width: number, height: number) =>
            ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
            const match = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(this.style.transform)
            if (this.dataset.testid === "container") return rectOf(0, 0, 500, 300)
            return match ? rectOf(Number(match[1]), Number(match[2]), 100, 50) : rectOf(0, 0, 0, 0)
        })
        let final = { x: 0, y: 0 }
        const Clamped = () => {
            const [position, setPosition] = useState({ x: 10, y: 20, scaleX: 1, scaleY: 1 })
            const onDragEnd = (event: DragEndEvent) => {
                final = { x: position.x + event.delta.x, y: position.y + event.delta.y }
                setPosition({ ...position, ...final })
            }
            return (
                <div data-testid="container">
                    <DndContext onDragEnd={onDragEnd} modifiers={[restrictToParentElement]} measuring={AUDIO_PLAYER_MEASURING}>
                        <DraggableAudioPlayer position={position} />
                    </DndContext>
                </div>
            )
        }
        const { getByTestId } = render(<Clamped />)
        fireEvent.pointerDown(getByTestId("handle"), { clientX: 0, clientY: 0, button: 0, isPrimary: true })
        await tick()
        fireEvent(document, new PointerEvent("pointermove", { clientX: 1000, clientY: 1000, bubbles: true }))
        await tick()
        fireEvent(document, new PointerEvent("pointerup", { clientX: 1000, clientY: 1000, bubbles: true }))
        await tick()
        // 500x300 container, 100x50 player: the bottom right corner is the farthest it can go
        expect(final).toEqual({ x: 400, y: 250 })
        vi.restoreAllMocks()
    })
})
