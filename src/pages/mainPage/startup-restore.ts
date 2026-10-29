import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useWorkspace } from "@/contexts/use-workspace"
import { reportError } from "@/lib/report-error"
import { getLastWorkspaceId, getReopenLastWorkspace, getStartupWorkspaceId } from "@/lib/store/preferences"

// The last workspace is restored at most once per app session
let startupHandled = false

/** Resets the once-per-session startup flag (tests only). */
export const resetStartupRestore = () => { startupHandled = false }

/**
 * Reopens the last workspace on the first mount of the session, when the preference is enabled: the workspace chosen in the settings, otherwise the last one used.
 * @param loaded Whether the workspaces list has been loaded.
 * @returns `pending` is true until the check is done, so the caller can avoid flashing the start page.
 * @category Hooks
 */
export const useStartupRestore = (loaded: boolean): { pending: boolean } => {
    const { workspaces, setCurrentWorkspace } = useWorkspace()
    const navigate = useNavigate()
    const [pending, setPending] = useState(!startupHandled)

    // Preferences are read from the store (not the context) to avoid racing the context defaults
    useEffect(() => {
        if (!loaded || startupHandled) return
        startupHandled = true
        const restore = async () => {
            const [reopen, fixedId, lastId] = await Promise.all([getReopenLastWorkspace(), getStartupWorkspaceId(), getLastWorkspaceId()])
            if (!reopen) return
            // A fixed workspace wins; when it does not exist any more (deleted) the last one used is opened
            const ws = workspaces.find(w => w.id === fixedId) ?? workspaces.find(w => w.id === lastId)
            if (!ws) return
            setCurrentWorkspace(ws)
            navigate(`/workspace/${ws.id}`)
        }
        restore().catch(error => reportError(error)).finally(() => setPending(false))
    }, [loaded, workspaces, setCurrentWorkspace, navigate])

    return { pending }
}
