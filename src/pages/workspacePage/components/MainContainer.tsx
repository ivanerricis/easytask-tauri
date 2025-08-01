import { useEffect, useState } from "react"
import { CenterContainer } from "./CenterContainer"
import { SideBarLeft } from "./sidebar/SideBarLeft"
import { DndContext, type DragEndEvent } from "@dnd-kit/core"
import { restrictToParentElement } from "@dnd-kit/modifiers"
import { DraggableAudioPlayer } from "@/components/draggable-audio-player"
import { usePreferences } from "@/contexts/preferences-context"

export const MainContainer = () => {
    const { audioPlayerPosition, audioPlayerContainerRef, setAudioPlayerPosition, resetPlayerPosition } = usePreferences()
    const [position, setPosition] = useState(audioPlayerPosition)

    useEffect(() => {
        if (audioPlayerPosition.x === 0 && audioPlayerPosition.y === 0)
            resetPlayerPosition()
        else
            setPosition(audioPlayerPosition)
    }, [audioPlayerPosition, resetPlayerPosition])

    const handleDragEnd = (event: DragEndEvent) => {
        if (event.active.id === "audio-player") {
            const newPosition = {
                x: position.x + event.delta.x,
                y: position.y + event.delta.y,
                scaleX: 1,
                scaleY: 1
            }
            setPosition(newPosition)
            setAudioPlayerPosition(newPosition)
        }
    }


    return (
        <div ref={audioPlayerContainerRef} className="flex flex-1 w-full h-full relative">
            <SideBarLeft />
            <DndContext onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
                <CenterContainer />
                <DraggableAudioPlayer position={position} />
            </DndContext>
        </div >
    )
}