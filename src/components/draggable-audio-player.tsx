import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { AudioPlayer } from "./audio-player"
import { useAudio } from "@/contexts/use-audio"
import { usePreferences } from "@/contexts/use-preferences"
import { useShortcut } from "@/hooks/use-shortcut"

type Props = {
    position: { x: number; y: number, scaleX: number, scaleY: number }
}

export const DraggableAudioPlayer = ({ position }: Props) => {
    const { track, closePlayer, reportPlaybackError, toggleSeq, setPlaybackState, togglePlayback } = useAudio()
    const { audioVolume, setAudioVolume, audioPlayerVisible, audioPlayerScale, audioPlayerOpacity } = usePreferences()
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: "audio-player",
    })

    // Play / pause from anywhere in the workspace while the player is open
    useShortcut("toggle-audio", togglePlayback, { enabled: track !== null && audioPlayerVisible })

    const style = {
        position: "absolute" as const,
        top: position.y,
        left: position.x,
        transform: CSS.Translate.toString(transform),
        zIndex: 50,
    }

    // Nothing is shown until the user clicks an audio file (nothing autoplays); the player can also be turned off in the settings
    if (!track || !audioPlayerVisible) return null

    return (
        <div ref={setNodeRef} style={style}>
            {/* zoom (not transform) resizes the layout box, so the dnd-kit modifiers keep the real size inside the window */}
            <div style={{ zoom: audioPlayerScale, opacity: audioPlayerOpacity }} data-testid="audio-player-frame">
                <AudioPlayer
                    src={track.src}
                    fileName={track.name}
                    autoPlayKey={track.playId}
                    toggleKey={toggleSeq}
                    onStateChange={setPlaybackState}
                    onClose={closePlayer}
                    onError={reportPlaybackError}
                    listenersHandle={listeners}
                    attributesHandle={attributes}
                    volume={audioVolume}
                    onVolumeChange={setAudioVolume}
                />
            </div>
        </div>
    )
}