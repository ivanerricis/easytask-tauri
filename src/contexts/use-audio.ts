import { useContext, useEffect, useState } from "react"
import type { AudioFile } from "@/types/types"
import { getDBGroupAudioFiles } from "@/db/queries/audio"
import { reportError } from "@/lib/report-error"
import { AudioContext } from "./audio-context-object"

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
 * The audio files of a group, reloaded whenever the audio state changes.
 * @param groupId The ID of the group.
 * @category Audio Context
 */
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
