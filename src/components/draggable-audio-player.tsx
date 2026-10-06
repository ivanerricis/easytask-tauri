import { useCallback, useEffect, useRef } from "react"
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
    const { audioVolume, setAudioVolume, audioPlayerVisible, audioPlayerScale, audioPlayerOpacity, reportAudioPlayerSize } = usePreferences()
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: "audio-player",
    })

    const nodeRef = useRef<HTMLDivElement | null>(null)
    const setRefs = useCallback((node: HTMLDivElement | null) => {
        nodeRef.current = node
        setNodeRef(node)
    }, [setNodeRef])
    const visible = track !== null && audioPlayerVisible

    // The real size (zoom included: the outer box has no zoom of its own) keeps the default and the clamped positions inside the window
    useEffect(() => {
        const node = nodeRef.current
        if (!visible || !node) return
        const measure = () => reportAudioPlayerSize({ width: node.offsetWidth, height: node.offsetHeight })
        measure()
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
        observer?.observe(node)
        return () => {
            observer?.disconnect()
            reportAudioPlayerSize(null)
        }
    }, [visible, reportAudioPlayerSize])

    // Play / pause from anywhere in the workspace while the player is open
    useShortcut("toggle-audio", togglePlayback, { enabled: visible })

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
        <div ref={setRefs} style={style}>
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