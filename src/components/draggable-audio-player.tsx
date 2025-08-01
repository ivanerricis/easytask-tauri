import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { AudioPlayer } from "./audio-player"

type Props = {
    position: { x: number; y: number, scaleX: number, scaleY: number }
}

export const DraggableAudioPlayer = ({ position }: Props) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: "audio-player",
    })

    const style = {
        position: "absolute" as const,
        top: position.y,
        left: position.x,
        transform: CSS.Translate.toString(transform),
        zIndex: 50,
    }


    return (
        <div ref={setNodeRef} style={style}>
            <AudioPlayer listenersHandle={listeners} attributesHandle={attributes} />
        </div>
    )
}