import { getPref, savePref, type AudioPositions } from "@/lib/store/preferences"
import { reportError } from "@/lib/report-error"

/** Nearer than this (seconds) to the start or to the end of a track there is nothing worth resuming. */
export const RESUME_MARGIN_SECONDS = 3
/** Seconds between two saves of the position while a track plays. */
export const POSITION_SAVE_INTERVAL_MS = 3000

/** Whether a position is worth remembering: at least RESUME_MARGIN_SECONDS from the start and, when the length is known, from the end. */
export const isResumable = (position: number, duration?: number): boolean => {
    if (!Number.isFinite(position) || position < RESUME_MARGIN_SECONDS) return false
    return !(typeof duration === "number" && Number.isFinite(duration) && duration > 0 && position > duration - RESUME_MARGIN_SECONDS)
}

// Reads and writes go one after the other, so two quick updates cannot overwrite each other.
// The positions are read from the store each time and never held in React state.
let queue: Promise<unknown> = Promise.resolve()
const update = (change: (positions: AudioPositions) => boolean): Promise<void> => {
    const run = queue.then(async () => {
        const positions = await getPref("audioPositions")
        if (change(positions)) await savePref("audioPositions", positions)
    })
    queue = run.catch(reportError)
    return run.catch(reportError)
}

/** Where to resume an audio file: the remembered position, or 0 (the start) when there is none or it is too near the start or the end. */
export const getResumePosition = async (audioId: number, duration?: number): Promise<number> => {
    try {
        const entry = (await getPref("audioPositions"))[String(audioId)]
        return entry && isResumable(entry.position, duration) ? entry.position : 0
    } catch (error) {
        reportError(error)
        return 0
    }
}

/** Remembers where an audio file is; a position too near the start or the end forgets it instead. */
export const rememberPosition = (audioId: number, position: number, duration?: number): Promise<void> =>
    update(positions => {
        const key = String(audioId)
        if (!isResumable(position, duration)) {
            if (!(key in positions)) return false
            delete positions[key]
            return true
        }
        positions[key] = { position: Math.round(position * 10) / 10, updatedAt: Date.now() }
        // The oldest entries beyond MAX_AUDIO_POSITIONS are dropped by the normalization of savePref
        return true
    })

/** Forgets the position of an audio file (it was played to the end). */
export const forgetPosition = (audioId: number): Promise<void> =>
    update(positions => {
        const key = String(audioId)
        if (!(key in positions)) return false
        delete positions[key]
        return true
    })
