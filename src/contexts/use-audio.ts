import i18n from "@/i18n"
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
 * The audio files of a group, reloaded whenever the audio state changes. The last list is remembered, so a group that
 * is collapsed and opened again (it is unmounted while collapsed) shows its files in the first render.
 * @param groupId The ID of the group.
 * @category Audio Context
 */
export function useGroupAudioFiles(groupId: number): AudioFile[] {
    const { version, filesCache } = useAudio()
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
