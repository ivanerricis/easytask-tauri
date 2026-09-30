import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { AudioPlayer } from "./audio-player"
import { useAudio } from "@/contexts/use-audio"

type Props = {
    position: { x: number; y: number, scaleX: number, scaleY: number }
}

export const DraggableAudioPlayer = ({ position }: Props) => {
    const { track, closePlayer, reportPlaybackError } = useAudio()
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

    // Nothing is shown until the user clicks an audio file (nothing autoplays)
    if (!track) return null

    return (
        <div ref={setNodeRef} style={style}>
            <AudioPlayer
                src={track.src}
                fileName={track.name}
                autoPlayKey={track.playId}
                onClose={closePlayer}
                onError={reportPlaybackError}
                listenersHandle={listeners}
                attributesHandle={attributes}
            />
        </div>
    )
}