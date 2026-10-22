import { useTranslation } from "react-i18next"
import { useRef, useState, useEffect } from "react"
import { Play, Pause, RotateCcw, RotateCw, SkipBack, Volume2, VolumeX, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Toggle } from "@/components/ui/toggle"
import { TooltipCustom } from "@/components/tooltip-custom"
import type { DraggableAttributes, useDraggable } from "@dnd-kit/core"
import type { PlaybackState } from "@/contexts/audio-context-object"
import { useMediaSession, type MediaSessionActions } from "@/hooks/use-media-session"

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

/**
 * The position and the length of the loaded track, followed on the audio element. `timeupdate` fires about four times a
 * second: the state lives in the components that show it, so the rest of the player does not re-render with it.
 */
const useAudioProgress = (audioRef: React.RefObject<HTMLAudioElement | null>) => {
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)

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
    }, [audioRef])

    return { currentTime, duration }
}

/** Shows the new position at once after the player moved it itself (the browser fires its own `timeupdate` a moment later). */
const notifyProgress = (audio: HTMLAudioElement) => { audio.dispatchEvent(new Event("timeupdate")) }

type SeekBarProps = {
    audioRef: React.RefObject<HTMLAudioElement | null>
    onSeek: (time: number) => void
    onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => void
}

/** The elapsed time, the seek slider and the length of the track. */
const SeekBar = ({ audioRef, onSeek, onKeyDown }: SeekBarProps) => {
    const { t } = useTranslation()
    const { currentTime, duration } = useAudioProgress(audioRef)

    return (
        <div className="w-full flex items-center gap-2 text-[13px] text-foreground tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <Slider
                min={0}
                max={duration > 0 ? duration : 1}
                step={0.1}
                value={[Math.min(currentTime, duration > 0 ? duration : 0)]}
                onValueChange={([time]) => onSeek(time)}
                onKeyDown={onKeyDown}
                aria-label={t("audio.player.seek")}
                aria-valuetext={t("audio.player.position", { current: formatTime(currentTime), total: formatTime(duration) })}
                thumbClassName="size-5"
                className="flex-1 min-w-0"
            />
            <span>{formatTime(duration)}</span>
        </div>
    )
}

type MediaSessionSyncProps = {
    audioRef: React.RefObject<HTMLAudioElement | null>
    title: string
    playing: boolean
    actions: MediaSessionActions
}

/** Publishes the track to the system (media keys, volume flyout, lock screen); renders nothing. */
const MediaSessionSync = ({ audioRef, title, playing, actions }: MediaSessionSyncProps) => {
    const { currentTime, duration } = useAudioProgress(audioRef)
    // Hardware media keys, the volume flyout and the lock screen of the system show the title and drive the player
    useMediaSession({ title, artist: "EasyTask", playing, position: currentTime, duration, actions })
    return null
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

    // A play request (new file) starts the track from the beginning
    useEffect(() => {
        const audio = audioRef.current
        if (!audio || autoPlayKey === undefined || !src) return
        audio.currentTime = 0
        notifyProgress(audio)
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
        notifyProgress(audio)
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
        notifyProgress(audio)
    }

    // Back / forward by a fixed amount, within the track
    const skip = (seconds: number) => seekTo((audioRef.current?.currentTime ?? 0) + seconds)

    // The arrows of a slider move it by its tiny step (0.1 s): here they jump by a few seconds, and Space plays or pauses
    // (a slider does not use it)
    const handleSeekKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault()
            skip(KEY_SEEK_SECONDS)
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault()
            skip(-KEY_SEEK_SECONDS)
        } else if (e.key === " ") {
            e.preventDefault()
            togglePlay()
        }
    }

    // While the slider is dragged only the player moves (the sound follows at once); the preference, which re-renders
    // the whole app and is written to disk, is updated once when the pointer is released
    const handleVolume = ([vol]: number[]) => {
        setVolume(vol)
        setMuted(false)
    }

    const handleVolumeCommit = ([vol]: number[]) => onVolumeChange?.(vol)

    const handleVolumeKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
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

    const mediaActions: MediaSessionActions = {
        play: () => { void audioRef.current?.play().catch(() => undefined) },
        pause: () => audioRef.current?.pause(),
        stop: handleClose,
        seekTo,
        seekBackward: (seconds = SKIP_SECONDS) => skip(-seconds),
        seekForward: (seconds = SKIP_SECONDS) => skip(seconds),
    }

    const title = fileName ?? t("audio.player.defaultTitle")
    const silent = muted || volume === 0
    const volumeLabel = muted ? 0 : Math.round(volume * 100)

    return (
        <div className={`w-[350px] p-2 rounded-xs bg-background border shadow-lg flex flex-col gap-2 text-muted-foreground ${open ? '' : 'hidden'}`}>
            {/* The header is the drag handle and only holds the close button */}
            <div
                className="-mx-2 -mt-2 -mb-2 p-0.5 flex items-center justify-end touch-none cursor-grab active:cursor-grabbing"
                {...listenersHandle} {...attributesHandle}
                aria-label={t("audio.player.move")}
            >
                <TooltipCustom text={t("audio.player.close")}>
                    <Button
                        type="button" variant="ghost" size="icon" onClick={handleClose} aria-label={t("audio.player.close")}
                        onPointerDown={event => event.stopPropagation()}
                        className="size-5 shrink-0 cursor-pointer"
                    >
                        <X className="!size-4" />
                    </Button>
                </TooltipCustom>
            </div>
            <Separator className="-mx-2 data-[orientation=horizontal]:w-[calc(100%+1rem)]" />
            {/* The title has a row of its own, as wide as the player: two lines at most, the tooltip has the whole name */}
            <div className="w-full line-clamp-2 break-words text-sm font-medium text-foreground" title={title}>{title}</div>
            <SeekBar audioRef={audioRef} onSeek={seekTo} onKeyDown={handleSeekKeyDown} />
            <MediaSessionSync audioRef={audioRef} title={title} playing={isPlaying} actions={mediaActions} />
            {/* Transport: start over, 15 s back, play / pause, 15 s forward, speed */}
            <div className="w-full flex items-center justify-center gap-1.5 text-xs">
                <TooltipCustom text={t("audio.player.restart")}>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={restart}
                        aria-label={t("audio.player.restart")}
                        className="shrink-0 rounded-full"
                    >
                        <SkipBack className="!size-4" />
                    </Button>
                </TooltipCustom>
                <TooltipCustom text={t("audio.player.back", { seconds: SKIP_SECONDS })}>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => skip(-SKIP_SECONDS)}
                        aria-label={t("audio.player.back", { seconds: SKIP_SECONDS })}
                        className="relative shrink-0 rounded-full"
                    >
                        <RotateCcw className="!size-6" />
                        <span aria-hidden className="absolute inset-0 flex items-center justify-center pt-px text-[9px] font-semibold tabular-nums">{SKIP_SECONDS}</span>
                    </Button>
                </TooltipCustom>
                <TooltipCustom text={isPlaying ? t("audio.player.pause") : t("audio.player.play")}>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={togglePlay}
                        aria-label={isPlaying ? t("audio.player.pause") : t("audio.player.play")}
                        className="shrink-0 size-10 rounded-full"
                    >
                        {isPlaying ? <Pause /> : <Play />}
                    </Button>
                </TooltipCustom>
                <TooltipCustom text={t("audio.player.forward", { seconds: SKIP_SECONDS })}>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => skip(SKIP_SECONDS)}
                        aria-label={t("audio.player.forward", { seconds: SKIP_SECONDS })}
                        className="relative shrink-0 rounded-full"
                    >
                        <RotateCw className="!size-6" />
                        <span aria-hidden className="absolute inset-0 flex items-center justify-center pt-px text-[9px] font-semibold tabular-nums">{SKIP_SECONDS}</span>
                    </Button>
                </TooltipCustom>
                <TooltipCustom text={t("audio.player.speed", { rate })}>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={cycleRate}
                        aria-label={t("audio.player.speed", { rate })}
                        className={cn(
                            "shrink-0 h-8 min-w-10 px-1 text-[13px] tabular-nums text-foreground",
                            rate !== 1 && "font-medium",
                        )}
                    >
                        {rate}×
                    </Button>
                </TooltipCustom>
            </div>
            <div className="w-full flex items-center gap-2 text-[13px] text-foreground">
                <TooltipCustom text={muted ? t("audio.player.unmute") : t("audio.player.mute")}>
                    <Toggle
                        pressed={muted}
                        onPressedChange={setMuted}
                        aria-label={muted ? t("audio.player.unmute") : t("audio.player.mute")}
                        className="size-6 min-w-6 shrink-0 p-0"
                    >
                        {silent ? <VolumeX /> : <Volume2 />}
                    </Toggle>
                </TooltipCustom>
                <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[volume]}
                    onValueChange={handleVolume}
                    onValueCommit={handleVolumeCommit}
                    onKeyDown={handleVolumeKeyDown}
                    aria-label={t("audio.player.volume")}
                    aria-valuetext={`${volumeLabel}%`}
                    thumbClassName="size-5"
                    className="flex-1 min-w-0"
                />
                <span className="w-8 text-right tabular-nums">{volumeLabel}</span>
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
