import { useLayoutEffect, useState } from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { DndContext, useDndContext, type DragEndEvent } from "@dnd-kit/core"
import { describe, it, expect, vi, beforeAll } from "vitest"
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

    it("never commits the old position without the drag, nor the new one with the drag still applied", async () => {
        const { getByTestId } = render(<Host />)
        const handle = getByTestId("handle")
        commits.length = 0

        fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, button: 0, isPrimary: true })
        await tick()
        fireEvent(document, new PointerEvent("pointermove", { clientX: 40, clientY: 30, bubbles: true }))
        await tick()
        fireEvent(document, new PointerEvent("pointermove", { clientX: 100, clientY: 50, bubbles: true }))
        await tick()
        const dragging = commits.length
        expect(commits[dragging - 1].transform).toContain("100px")
        fireEvent(document, new PointerEvent("pointerup", { clientX: 100, clientY: 50, bubbles: true }))
        await tick()

        const release = commits.slice(dragging)
        expect(release.length).toBeGreaterThan(0)
        for (const state of release) {
            // The drag is gone (no transform) only together with the new position
            expect(state.transform).toBe("")
            expect(state).toMatchObject({ left: "110px", top: "70px" })
        }
    })
})
