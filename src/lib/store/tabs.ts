import type { TabsState } from "@/contexts/tabs-reducer"
import { store } from "./initStore"

const tabsKey = (workspaceId: number) => `openTabs:${workspaceId}`

/**
 * Gets the open note tabs saved for a workspace.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to the saved tabs (empty if none or malformed).
 * @category Store
 */
export const getWorkspaceTabs = async (workspaceId: number): Promise<TabsState> => {
    const value = await store.get<Partial<TabsState>>(tabsKey(workspaceId))
    const openIds = Array.isArray(value?.openIds) ? value.openIds.filter((id): id is number => typeof id === "number") : []
    const activeId = typeof value?.activeId === "number" && openIds.includes(value.activeId) ? value.activeId : null
    return { openIds, activeId }
}

/**
 * Saves the open note tabs of a workspace.
 * @param workspaceId The ID of the workspace.
 * @param tabs The open tabs and the active one.
 * @returns A promise that resolves when the tabs are saved.
 * @category Store
 */
export const saveWorkspaceTabs = async (workspaceId: number, tabs: TabsState): Promise<void> => {
    await store.set(tabsKey(workspaceId), tabs)
    await store.save()
}
