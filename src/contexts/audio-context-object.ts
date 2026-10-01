import { createContext } from "react"
import type { AudioFile } from "@/types/types"

/**
 * The track loaded in the player. `playId` changes at every request, so clicking the file that is
 * already loaded restarts it.
 * @category Audio Context
 */
export type AudioTrack = {
    audioId: number
    name: string
    /** URL served by the asset protocol (the file is allowed at runtime, one file at a time). */
    src: string
    playId: number
}

export type AudioContextType = {
    /** The track of the player, null when the player is closed. */
    track: AudioTrack | null
    /** Incremented whenever the audio files may have changed (add, rename, relink, delete, trash operations). */
    version: number
    /**
     * Plays a file: checks it exists and grants the webview access to it, then opens the player and starts.
     * A missing file opens the "File non trovato" dialog (relink or delete the reference).
     */
    playFile: (file: AudioFile) => Promise<void>
    /** Closes the player and stops the playback. */
    closePlayer: () => void
    /** Asks for audio files and attaches them to a group. */
    addFiles: (groupId: number) => Promise<void>
    /** Asks for the new location of a file and stores it; when `play` is true the file is played afterwards. */
    relinkFile: (file: AudioFile, play?: boolean) => Promise<void>
    /** Tells the lists to reload (call after operations done outside this context, e.g. rename/delete dialogs). */
    refresh: () => void
    /** Called by the player when the media element fails (unsupported codec, file removed after the check...). */
    reportPlaybackError: () => Promise<void>
}

export const AudioContext = createContext<AudioContextType | null>(null)
