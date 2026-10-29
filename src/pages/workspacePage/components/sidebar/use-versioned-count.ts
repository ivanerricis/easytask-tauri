import { useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceVersion, type WorkspaceVersionKind } from "@/contexts/workspace-data"
import { reportError } from "@/lib/report-error"

/**
 * A count of the current workspace (trash, archive, templates...) that is queried again whenever the workspace changes or the
 * version counter of that list is bumped (every write that touches the list bumps it).
 */
export const useVersionedCount = (kind: WorkspaceVersionKind, fetcher: (workspaceId: number) => Promise<number>): number => {
    const { currentWorkspace } = useWorkspace()
    const version = useWorkspaceVersion(kind)
    const [count, setCount] = useState(0)
    const workspaceID = currentWorkspace?.id

    useEffect(() => {
        if (workspaceID === undefined) return
        let cancelled = false
        fetcher(workspaceID)
            .then(total => { if (!cancelled) setCount(total) })
            .catch(error => reportError(error))
        return () => { cancelled = true }
    }, [workspaceID, version, fetcher])

    return count
}
