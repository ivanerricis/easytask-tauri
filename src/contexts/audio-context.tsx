import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { convertFileSrc, invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"
import type { AudioFile } from "@/types/types"
import {
    AUDIO_EXTENSIONS, createDBAudioFile, getDBAudioFile, getDBGroupAudioFiles, updateDBAudioFilePath,
} from "@/db/queries/audio"
import { useWorkspaceActions, useWorkspaceState } from "./workspace-data-context"
import { getErrorMessage } from "@/lib/utils"
import { reportError } from "@/lib/report-error"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"

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

type AudioContextType = {
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

const AudioContext = createContext<AudioContextType | null>(null)

const filters = [{ name: "File audio", extensions: [...AUDIO_EXTENSIONS] }]

/**
 * State of the audio files attached to the groups and of the floating player.
 * The playback is deliberately not tied to the open note: it continues across tab switches
 * and stops only when the user closes the player, when the played file is deleted or when the workspace is left.
 * Mounted above both the note view and the player.
 * @category Audio Context
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
    const { trashVersion } = useWorkspaceState()
    const { deleteItem } = useWorkspaceActions()
    const [track, setTrack] = useState<AudioTrack | null>(null)
    const [localVersion, setLocalVersion] = useState(0)
    const [missing, setMissing] = useState<AudioFile | null>(null)
    const playSeq = useRef(0)
    const trackRef = useRef(track)
    const knownFiles = useRef(new Map<number, AudioFile>())

    // Both counters only grow, so their sum changes whenever either does
    const version = localVersion + (trashVersion ?? 0)

    useEffect(() => {
        trackRef.current = track
    }, [track])

    const refresh = useCallback(() => setLocalVersion(value => value + 1), [])

    const closePlayer = useCallback(() => setTrack(null), [])

    const playFile = useCallback(async (file: AudioFile) => {
        knownFiles.current.set(file.id, file)
        try {
            await invoke("allow_audio_file", { path: file.path })
        } catch {
            setMissing(file)
            return
        }
        setTrack({ audioId: file.id, name: file.name, src: convertFileSrc(file.path), playId: ++playSeq.current })
    }, [])

    const addFiles = useCallback(async (groupId: number) => {
        try {
            const selected = await open({ multiple: true, directory: false, filters })
            if (!selected) return
            const paths = Array.isArray(selected) ? selected : [selected]

            let failed = 0
            for (const path of paths) {
                try {
                    await createDBAudioFile(groupId, path)
                } catch (error) {
                    failed++
                    toast.error(getErrorMessage(error))
                }
            }
            refresh()
            if (paths.length > failed)
                toast.success(paths.length - failed === 1 ? "File audio aggiunto" : `${paths.length - failed} file audio aggiunti`)
        } catch (error) {
            toast.error("Impossibile aggiungere i file audio: " + getErrorMessage(error))
        }
    }, [refresh])

    const relinkFile = useCallback(async (file: AudioFile, play = false) => {
        try {
            const selected = await open({ multiple: false, directory: false, filters })
            const path = Array.isArray(selected) ? selected[0] : selected
            if (!path) return

            await updateDBAudioFilePath(file.id, path)
            refresh()
            const updated = { ...file, path }
            knownFiles.current.set(file.id, updated)
            if (play) await playFile(updated)
            else toast.success("Percorso aggiornato")
        } catch (error) {
            toast.error("Impossibile aggiornare il percorso: " + getErrorMessage(error))
        }
    }, [playFile, refresh])

    const reportPlaybackError = useCallback(async () => {
        const current = trackRef.current
        if (!current) return
        const file = knownFiles.current.get(current.audioId)
        const exists = await invoke<boolean>("audio_file_exists", { path: file?.path ?? "" }).catch(() => true)
        if (!exists && file) {
            setTrack(null)
            setMissing(file)
        } else {
            toast.error("Impossibile riprodurre il file audio (formato non supportato o file non leggibile)")
        }
    }, [])

    // The played file was deleted (or renamed) from a dialog, the trash or another view: keep the player in sync
    useEffect(() => {
        const current = trackRef.current
        if (!current) return
        let stale = false
        getDBAudioFile(current.audioId)
            .then(file => {
                if (stale) return
                if (!file) setTrack(null)
                else {
                    knownFiles.current.set(file.id, file)
                    setTrack(latest => latest && latest.audioId === file.id && latest.name !== file.name
                        ? { ...latest, name: file.name } : latest)
                }
            })
            .catch(error => reportError(error))
        return () => { stale = true }
    }, [version])

    const handleDeleteReference = async () => {
        const file = missing
        setMissing(null)
        if (!file) return
        try {
            await deleteItem("audio_file", file.id)
            refresh()
            toast.success("Riferimento spostato nel cestino")
        } catch (error) {
            toast.error("Impossibile eliminare il riferimento: " + getErrorMessage(error))
        }
    }

    const handleRelink = () => {
        const file = missing
        setMissing(null)
        if (file) void relinkFile(file, true)
    }

    const value = useMemo<AudioContextType>(() => ({
        track, version, playFile, closePlayer, addFiles, relinkFile, refresh, reportPlaybackError,
    }), [track, version, playFile, closePlayer, addFiles, relinkFile, refresh, reportPlaybackError])

    return (
        <AudioContext.Provider value={value}>
            {children}
            <AlertDialog open={missing !== null} onOpenChange={(isOpen) => { if (!isOpen) setMissing(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>File non trovato</AlertDialogTitle>
                        <AlertDialogDescription>
                            Il file audio non si trova più nel percorso salvato: potrebbe essere stato spostato o eliminato.
                            Puoi indicare il nuovo percorso oppure eliminare il riferimento.
                        </AlertDialogDescription>
                        <p className="text-xs text-muted-foreground break-all rounded-xs border bg-secondary p-2">
                            {missing?.path}
                        </p>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({ variant: "destructive" })}
                            onClick={handleDeleteReference}
                        >
                            Elimina riferimento
                        </AlertDialogAction>
                        <AlertDialogAction onClick={handleRelink}>
                            Aggiorna percorso
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AudioContext.Provider>
    )
}

/**
 * The audio state and actions.
 * @category Audio Context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAudio = () => {
    const context = useContext(AudioContext)
    if (!context) throw new Error("useAudio must be used within an AudioProvider")
    return context
}

/**
 * The audio files of a group, reloaded whenever the audio state changes.
 * @param groupId The ID of the group.
 * @category Audio Context
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useGroupAudioFiles(groupId: number): AudioFile[] {
    const { version } = useAudio()
    const [files, setFiles] = useState<AudioFile[]>([])

    useEffect(() => {
        let stale = false
        getDBGroupAudioFiles(groupId)
            .then(rows => { if (!stale) setFiles(rows) })
            .catch(error => reportError(error, "Impossibile caricare i file audio."))
        return () => { stale = true }
    }, [groupId, version])

    return files
}
