import { useTranslation } from "react-i18next"
import { useRef, useState, useEffect } from "react"
import { Play, Pause, Volume2, GripVertical, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DraggableAttributes, useDraggable } from "@dnd-kit/core"

type SyntheticListenerMap = ReturnType<typeof useDraggable>["listeners"]

type Props = {
    src?: string
    fileName?: string
    listenersHandle: SyntheticListenerMap | undefined
    attributesHandle: DraggableAttributes
    /** Controlled visibility (default: visible). */
    open?: boolean
    /** Called after the X button paused the playback. */
    onClose?: () => void
    /** Changes at every play request: when set, the track (re)starts from the beginning as soon as it changes. */
    autoPlayKey?: number
    /** Called when the media element reports an error (unsupported codec, file removed...). */
    onError?: () => void
}

export const AudioPlayer = ({ src, fileName, listenersHandle, attributesHandle, open = true, onClose, autoPlayKey, onError }: Props) => {
    const { t } = useTranslation()
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const updateTime = () => setCurrentTime(audio.currentTime)
        const setMeta = () => setDuration(audio.duration)

        audio.addEventListener("timeupdate", updateTime)
        audio.addEventListener("loadedmetadata", setMeta)

        return () => {
            audio.removeEventListener("timeupdate", updateTime)
            audio.removeEventListener("loadedmetadata", setMeta)
        }
    }, [])

    // A play request (new file or same file clicked again) starts the track from the beginning
    useEffect(() => {
        const audio = audioRef.current
        if (!audio || autoPlayKey === undefined || !src) return
        audio.currentTime = 0
        setCurrentTime(0)
        audio.play().catch(() => setIsPlaying(false))
    }, [autoPlayKey, src])

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return
        if (isPlaying) {
            audio.pause()
        } else {
            audio.play().catch(() => setIsPlaying(false))
        }
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value)
        if (audioRef.current) {
            audioRef.current.currentTime = time
            setCurrentTime(time)
        }
    }

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = Number(e.target.value)
        setVolume(vol)
        if (audioRef.current) {
            audioRef.current.volume = vol
        }
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = Math.floor(seconds % 60)
        return `${m}:${s < 10 ? "0" : ""}${s}`
    }

    const handleClose = () => {
        audioRef.current?.pause()
        onClose?.()
    }

    return (
        <div className={`w-[350px] p-2 rounded-xs bg-background border shadow flex flex-col gap-2 text-muted-foreground ${open ? '' : 'hidden'}`}>
            <div className="w-full flex items-center justify-between gap-3 text-xs">
                <div
                    className="p-1 hover:bg-accent rounded-xs cursor-move text-muted-foreground hover:text-foreground"
                    {...listenersHandle} {...attributesHandle}
                >
                    <GripVertical className="size-4" />
                </div>
                <span>{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min={0}
                    max={duration}
                    value={currentTime}
                    step={0.1}
                    onChange={handleSeek}
                    aria-label={t("audio.player.seek")}
                    className={cn("flex-1")}
                />
                <span>{formatTime(duration)}</span>
                <button type="button" onClick={handleClose} aria-label={t("audio.player.close")} className="p-1 hover:bg-accent rounded-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <X className="size-4" />
                </button>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-start text-sm truncate w-full">{fileName ?? t("audio.player.defaultTitle")}</div>
                <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? t("audio.player.pause") : t("audio.player.play")}
                    className="w-fit p-2 bg-secondary rounded-full hover:bg-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <div className="flex items-center justify-end w-full gap-2">
                    <Volume2 className="size-4 text-muted-foreground shrink-0" />
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={handleVolume}
                        aria-label={t("audio.player.volume")}
                        className="w-full"
                    />
                    <span className="w-5">{Math.round(volume * 100)}</span>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={src}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={() => { setIsPlaying(false); onError?.() }}
                className="hidden"
            />
        </div>
    )
}