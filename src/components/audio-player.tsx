import { useRef, useState, useEffect } from "react"
import { Play, Pause, Volume2, GripVertical, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import type { DraggableAttributes } from "@dnd-kit/core"

type Props = {
    src?: string
    fileName?: string
    listenersHandle: SyntheticListenerMap | undefined
    attributesHandle: DraggableAttributes
}

export const AudioPlayer = ({ src, fileName, listenersHandle, attributesHandle }: Props) => {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [open, setOpen] = useState(true)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const updateTime = () => setCurrentTime(audio.currentTime)
        const setMeta = () => setDuration(audio.duration)

        audio.addEventListener("timeupdate", updateTime)
        audio.addEventListener("loadedmetadata", setMeta)
        audio.volume = volume

        return () => {
            audio.removeEventListener("timeupdate", updateTime)
            audio.removeEventListener("loadedmetadata", setMeta)
        }
    }, [])

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return
        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
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

    const handleOpen = () => {
        setOpen(false)
        const audio = audioRef.current
        if (!audio) return
        audio.pause()
    }

    return (
        <div className={`w-[350px] p-2 rounded-xs bg-background border shadow flex flex-col gap-2 text-muted-foreground, ${open ? '' : 'hidden'}`}>
            <div className="w-full flex items-center justify-between gap-3 text-xs">
                <div
                    className="p-1 hover:bg-accent rounde-xs cursor-move text-muted-foreground hover:text-foreground"
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
                    className={cn("flex-1")}
                />
                <span>{formatTime(duration)}</span>
                <div onClick={handleOpen} className="p-1 hover:bg-accent rounde-xs cursor-pointer">
                    <X className="size-4" />
                </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-start text-sm truncate w-full">{fileName ?? "Audio file title"}</div>
                <button
                    onClick={togglePlay}
                    className="w-fit p-2 bg-secondary rounded-full hover:bg-accent cursor-pointer"
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
                        className="w-full"
                    />
                    <h1 className="w-5">{Math.round(volume * 100)}</h1>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={src}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="hidden"
            />
        </div>
    )
}