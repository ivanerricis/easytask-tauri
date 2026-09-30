import { useEffect } from "react"
import { CenterContainer } from "./CenterContainer"
import { SideBarLeft } from "./sidebar/SideBarLeft"
import { DndContext, type DragEndEvent } from "@dnd-kit/core"
import { restrictToParentElement } from "@dnd-kit/modifiers"
import { DraggableAudioPlayer } from "@/components/draggable-audio-player"
import { usePreferences } from "@/contexts/use-preferences"
import { useTabShortcuts } from "@/hooks/use-tab-shortcuts"

export const MainContainer = () => {
    const { audioPlayerPosition, audioPlayerContainerRef, setAudioPlayerPosition, resetPlayerPosition } = usePreferences()
    useTabShortcuts()

    useEffect(() => {
        if (audioPlayerPosition.x === 0 && audioPlayerPosition.y === 0)
            resetPlayerPosition()
    }, [audioPlayerPosition, resetPlayerPosition])

    const handleDragEnd = (event: DragEndEvent) => {
        if (event.active.id === "audio-player") {
            const newPosition = {
                x: audioPlayerPosition.x + event.delta.x,
                y: audioPlayerPosition.y + event.delta.y,
                scaleX: 1,
                scaleY: 1
            }
            setAudioPlayerPosition(newPosition)
        }
    }


    return (
        <div ref={audioPlayerContainerRef} className="flex flex-1 w-full h-full relative">
            <SideBarLeft />
            <DndContext onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
                <CenterContainer />
                <DraggableAudioPlayer position={audioPlayerPosition} />
            </DndContext>
        </div >
    )
}