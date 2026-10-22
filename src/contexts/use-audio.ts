import i18n from "@/i18n"
import { useContext, useEffect, useState } from "react"
import type { AudioFile } from "@/types/types"
import { getDBGroupAudioFiles, getDBNoteAudioFiles } from "@/db/queries/audio"
import { reportError } from "@/lib/report-error"
import { AudioActionsContext, AudioContext, AudioFilesContext } from "./audio-context-object"

/**
 * The audio state and actions.
 * @category Audio Context
 */
export const useAudio = () => {
    const context = useContext(AudioContext)
    if (!context) throw new Error("useAudio must be used within an AudioProvider")
    return context
}

/**
 * The audio actions only. Unlike `useAudio` the result keeps its identity while the playback changes, so the component does not
 * re-render on play/pause.
 * @category Audio Context
 */
export const useAudioActions = () => {
    const context = useContext(AudioActionsContext)
    if (!context) throw new Error("useAudioActions must be used within an AudioProvider")
    return context
}

/**
 * The audio files of a group, reloaded whenever the audio state changes. The last list is remembered, so a group that
 * is collapsed and opened again (it is unmounted while collapsed) shows its files in the first render.
 * @param groupId The ID of the group.
 * @category Audio Context
 */
export function useGroupAudioFiles(groupId: number): AudioFile[] {
    const context = useContext(AudioFilesContext)
    if (!context) throw new Error("useGroupAudioFiles must be used within an AudioProvider")
    const { version, filesCache } = context
    const [files, setFiles] = useState<AudioFile[]>(() => filesCache.get(groupId) ?? [])

    useEffect(() => {
        let stale = false
        getDBGroupAudioFiles(groupId)
            .then(rows => {
                if (stale) return
                filesCache.set(groupId, rows)
                setFiles(rows)
            })
            .catch(error => reportError(error, i18n.t("errors.loadAudio")))
        return () => { stale = true }
    }, [groupId, version, filesCache])

    return files
}

/**
 * The number of audio files of each group of a note (groups without files have no entry): one query for the whole
 * note, reloaded whenever the audio state changes. Works without an AudioProvider (it then loads once).
 * @param noteId The ID of the note (null: no note, nothing is loaded).
 * @param enabled When false nothing is loaded (the counts are not shown).
 * @category Audio Context
 */
export function useNoteAudioCounts(noteId: number | null, enabled = true): Record<number, number> {
    const version = useContext(AudioFilesContext)?.version ?? 0
    const [loaded, setLoaded] = useState<{ noteId: number, counts: Record<number, number> } | null>(null)

    useEffect(() => {
        if (noteId === null || !enabled) return
        let stale = false
        getDBNoteAudioFiles(noteId)
            .then(byGroup => {
                if (stale) return
                const counts: Record<number, number> = {}
                for (const [groupId, files] of Object.entries(byGroup)) counts[Number(groupId)] = files.length
                setLoaded({ noteId, counts })
            })
            .catch(error => reportError(error, i18n.t("errors.loadAudio")))
        return () => { stale = true }
    }, [noteId, enabled, version])

    return enabled && loaded?.noteId === noteId ? loaded.counts : EMPTY_COUNTS
}

const EMPTY_COUNTS: Record<number, number> = {}
