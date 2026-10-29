import { useMemo } from "react"
import { useWorkspaceData } from "@/contexts/workspace-data"
import type { TreeData } from "./tree-dnd"

const EMPTY: TreeData = { rootFolders: [], rootNotes: [] }

/**
 * The workspace tree as a {@link TreeData}, with a stable identity: it changes only when the workspace tree does.
 * Stable identity matters because the lookups of `listTreeItems` are cached by the identity of this wrapper.
 */
export const useTreeData = (): TreeData => {
    const { workspaceDataTree } = useWorkspaceData()
    return useMemo(
        () => workspaceDataTree ? { rootFolders: workspaceDataTree.rootFolders ?? [], rootNotes: workspaceDataTree.rootNotes ?? [] } : EMPTY,
        [workspaceDataTree],
    )
}
