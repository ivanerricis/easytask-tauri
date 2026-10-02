import { useTranslation } from "react-i18next"
import { useRef, useState, useEffect } from "react"
import { Play, Pause, RotateCcw, RotateCw, SkipBack, Volume2, VolumeX, Grip, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { rangeStyle } from "@/lib/range"
import type { DraggableAttributes, useDraggable } from "@dnd-kit/core"
import type { PlaybackState } from "@/contexts/audio-context-object"

type SyntheticListenerMap = ReturnType<typeof useDraggable>["listeners"]

/** Playback speeds the speed button cycles through. */
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const
/** Seconds the arrow keys move the seek bar. */
const KEY_SEEK_SECONDS = 5
/** Seconds of the "back" and "forward" buttons, also used by the seek keys of the system. */
const SKIP_SECONDS = 15

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
    /** Changes at every pause/resume request (e.g. the same file clicked again, the shortcut): the player toggles when it changes. */
    toggleKey?: number
    /** Called when the player starts playing, is paused, or plays the track to its end. */
    onStateChange?: (state: PlaybackState) => void
    /** Called when the media element reports an error (unsupported codec, file removed...). */
    onError?: () => void
    /** Volume (0-1): the player follows it when it changes from outside (e.g. the settings). Default 1. */
    volume?: number
    /** Called when the user moves the volume slider. */
    onVolumeChange?: (volume: number) => void
}

/** "3:05", or "1:05:09" from one hour on. */
const formatTime = (seconds: number) => {
    const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const ss = s < 10 ? `0${s}` : `${s}`
    return h > 0 ? `${h}:${m < 10 ? "0" : ""}${m}:${ss}` : `${m}:${ss}`
}

export const AudioPlayer = ({
    src, fileName, listenersHandle, attributesHandle, open = true, onClose, autoPlayKey, toggleKey, onStateChange, onError,
    volume: volumeProp = 1, onVolumeChange,
}: Props) => {
    const { t } = useTranslation()
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    // Played to the end (until it plays again, is moved back or another track is loaded)
    const [ended, setEnded] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(volumeProp)
    const [lastVolumeProp, setLastVolumeProp] = useState(volumeProp)
    // Muting is only for this player: it is not saved as the default volume
    const [muted, setMuted] = useState(false)
    const [rate, setRate] = useState<number>(1)
    const lastToggleKey = useRef(toggleKey)

    // Follow the volume set from outside (settings), without an effect
    if (volumeProp !== lastVolumeProp) {
        setLastVolumeProp(volumeProp)
        setVolume(volumeProp)
    }

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume
    }, [volume])

    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = muted
    }, [muted])

    // The default rate survives the load of another track (loading resets the rate to the default one)
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        audio.defaultPlaybackRate = rate
        audio.playbackRate = rate
    }, [rate])

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

    // A play request (new file) starts the track from the beginning
    useEffect(() => {
        const audio = audioRef.current
        if (!audio || autoPlayKey === undefined || !src) return
        audio.currentTime = 0
        setCurrentTime(0)
        audio.play().catch(() => setIsPlaying(false))
    }, [autoPlayKey, src])

    const state: PlaybackState = isPlaying ? "playing" : ended ? "ended" : "paused"
    useEffect(() => {
        onStateChange?.(state)
    }, [state, onStateChange])

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return
        if (isPlaying) {
            audio.pause()
        } else {
            audio.play().catch(() => setIsPlaying(false))
        }
    }

    // Starts the track over, whether it is playing, paused or ended
    const restart = () => {
        const audio = audioRef.current
        if (!audio) return
        audio.currentTime = 0
        setCurrentTime(0)
        audio.play().catch(() => setIsPlaying(false))
    }

    // A pause/resume request from outside (the same file clicked again, the shortcut)
    useEffect(() => {
        if (toggleKey === lastToggleKey.current) return
        lastToggleKey.current = toggleKey
        togglePlay()
    })

    const seekTo = (time: number) => {
        const audio = audioRef.current
        if (!audio) return
        const max = Number.isFinite(audio.duration) ? audio.duration : time
        const clamped = Math.min(Math.max(time, 0), max)
        audio.currentTime = clamped
        setCurrentTime(clamped)
    }

    // Back / forward by a fixed amount, within the track
    const skip = (seconds: number) => seekTo((audioRef.current?.currentTime ?? 0) + seconds)

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => seekTo(Number(e.target.value))

    // The arrows of a range move it by its tiny step (0.1 s): here they jump by a few seconds, and Space plays or pauses
    // (a slider does not use it)
    const handleSeekKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault()
            seekTo((audioRef.current?.currentTime ?? 0) + KEY_SEEK_SECONDS)
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault()
            seekTo((audioRef.current?.currentTime ?? 0) - KEY_SEEK_SECONDS)
        } else if (e.key === " ") {
            e.preventDefault()
            togglePlay()
        }
    }

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = Number(e.target.value)
        setVolume(vol)
        setMuted(false)
        onVolumeChange?.(vol)
    }

    const handleVolumeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === " ") {
            e.preventDefault()
            togglePlay()
        }
    }

    const cycleRate = () => {
        const index = PLAYBACK_RATES.indexOf(rate as (typeof PLAYBACK_RATES)[number])
        setRate(PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length])
    }

    const handleClose = () => {
        audioRef.current?.pause()
        onClose?.()
    }

    // Hardware media keys, the volume flyout and the lock screen of the system show the title and drive the player
    const closeRef = useRef(handleClose)
    useEffect(() => {
        closeRef.current = handleClose
    })

    useEffect(() => {
        const session = typeof navigator === "undefined" ? undefined : navigator.mediaSession
        if (!session || typeof MediaMetadata === "undefined") return
        session.metadata = new MediaMetadata({ title: fileName ?? t("audio.player.defaultTitle"), artist: "EasyTask" })
        return () => { session.metadata = null }
    }, [fileName, t])

    useEffect(() => {
        const session = typeof navigator === "undefined" ? undefined : navigator.mediaSession
        if (session) session.playbackState = isPlaying ? "playing" : "paused"
    }, [isPlaying])

    useEffect(() => {
        const session = typeof navigator === "undefined" ? undefined : navigator.mediaSession
        if (!session) return
        const audio = () => audioRef.current
        const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
            ["play", () => { void audio()?.play().catch(() => undefined) }],
            ["pause", () => audio()?.pause()],
            ["stop", () => closeRef.current()],
            ["seekto", details => { if (audio() && details.seekTime !== undefined) audio()!.currentTime = details.seekTime }],
            ["seekbackward", details => { if (audio()) audio()!.currentTime -= details.seekOffset ?? SKIP_SECONDS }],
            ["seekforward", details => { if (audio()) audio()!.currentTime += details.seekOffset ?? SKIP_SECONDS }],
        ]
        for (const [action, handler] of handlers) {
            try { session.setActionHandler(action, handler) } catch { /* action not supported by this webview */ }
        }
        return () => {
            for (const [action] of handlers) {
                try { session.setActionHandler(action, null) } catch { /* ignore */ }
            }
            session.playbackState = "none"
        }
    }, [])

    const title = fileName ?? t("audio.player.defaultTitle")
    const silent = muted || volume === 0
    const volumeLabel = muted ? 0 : Math.round(volume * 100)

    return (
        <div className={`w-[350px] p-2 rounded-xs bg-background border shadow flex flex-col gap-2 text-muted-foreground ${open ? '' : 'hidden'}`}>
            {/* The title has a row of its own, as wide as the player: two lines at most, the tooltip has the whole name */}
            <div className="w-full flex items-center gap-2">
                {/* The same handle as the groups */}
                <div
                    className="group shrink-0 flex items-center justify-center p-1 touch-none cursor-grab active:cursor-grabbing"
                    {...listenersHandle} {...attributesHandle}
                >
                    <Grip className="size-4 text-muted-foreground group-hover:text-foreground" />
                </div>
                <div className="flex-1 min-w-0 line-clamp-2 break-words text-sm font-medium text-foreground" title={title}>{title}</div>
                <button type="button" onClick={handleClose} aria-label={t("audio.player.close")} className="shrink-0 p-1 hover:bg-accent rounded-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <X className="size-4" />
                </button>
            </div>
            <div className="w-full flex items-center gap-2 text-xs tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min={0}
                    max={duration}
                    value={currentTime}
                    step={0.1}
                    onChange={handleSeek}
                    onKeyDown={handleSeekKeyDown}
                    aria-label={t("audio.player.seek")}
                    aria-valuetext={t("audio.player.position", { current: formatTime(currentTime), total: formatTime(duration) })}
                    style={rangeStyle(currentTime, 0, duration)}
                    className="flex-1 min-w-0"
                />
                <span>{formatTime(duration)}</span>
            </div>
            {/* Transport: start over, 15 s back, play / pause, 15 s forward, speed */}
            <div className="w-full flex items-center justify-center gap-1.5 text-xs">
                <button
                    type="button"
                    onClick={restart}
                    aria-label={t("audio.player.restart")}
                    title={t("audio.player.restart")}
                    className="shrink-0 p-2 rounded-full hover:bg-accent hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <SkipBack className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={() => skip(-SKIP_SECONDS)}
                    aria-label={t("audio.player.back", { seconds: SKIP_SECONDS })}
                    title={t("audio.player.back", { seconds: SKIP_SECONDS })}
                    className="relative shrink-0 p-1 rounded-full hover:bg-accent hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <RotateCcw className="size-6" />
                    <span aria-hidden className="absolute inset-0 flex items-center justify-center pt-px text-[9px] font-semibold tabular-nums">{SKIP_SECONDS}</span>
                </button>
                <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? t("audio.player.pause") : t("audio.player.play")}
                    className="shrink-0 p-2.5 bg-secondary rounded-full hover:bg-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
                </button>
                <button
                    type="button"
                    onClick={() => skip(SKIP_SECONDS)}
                    aria-label={t("audio.player.forward", { seconds: SKIP_SECONDS })}
                    title={t("audio.player.forward", { seconds: SKIP_SECONDS })}
                    className="relative shrink-0 p-1 rounded-full hover:bg-accent hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <RotateCw className="size-6" />
                    <span aria-hidden className="absolute inset-0 flex items-center justify-center pt-px text-[9px] font-semibold tabular-nums">{SKIP_SECONDS}</span>
                </button>
                <button
                    type="button"
                    onClick={cycleRate}
                    aria-label={t("audio.player.speed", { rate })}
                    title={t("audio.player.speed", { rate })}
                    className={cn(
                        "shrink-0 min-w-10 px-1 py-1 rounded-xs text-xs tabular-nums hover:bg-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        rate !== 1 && "text-foreground font-medium",
                    )}
                >
                    {rate}×
                </button>
            </div>
            <div className="w-full flex items-center gap-2 text-xs">
                <button
                    type="button"
                    onClick={() => setMuted(value => !value)}
                    aria-label={muted ? t("audio.player.unmute") : t("audio.player.mute")}
                    aria-pressed={muted}
                    className="shrink-0 p-0.5 rounded-xs hover:bg-accent hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {silent ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={handleVolume}
                    onKeyDown={handleVolumeKeyDown}
                    aria-label={t("audio.player.volume")}
                    aria-valuetext={`${volumeLabel}%`}
                    style={rangeStyle(volume, 0, 1)}
                    className="flex-1 min-w-0"
                />
                <span className="w-7 text-right tabular-nums">{volumeLabel}</span>
            </div>

            <audio
                ref={audioRef}
                src={src}
                onPlay={() => { setIsPlaying(true); setEnded(false) }}
                onPause={() => setIsPlaying(false)}
                onEnded={() => { setIsPlaying(false); setEnded(true) }}
                onSeeked={e => { if (!e.currentTarget.ended) setEnded(false) }}
                onEmptied={() => setEnded(false)}
                onError={() => { setIsPlaying(false); onError?.() }}
                className="hidden"
            />
        </div>
    )
}
