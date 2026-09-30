import type { AudioPlayerPosition } from "@/types/types"
import { store } from "./initStore"

const SHOW_PROGRESSBAR_KEY = "showProgressBar"
const PRIMARY_COLOR_KEY = "primaryColor"
const SHOW_SECTION_COUNT_KEY = "showSectionCount"
const SHOW_TASK_COUNT_KEY = "showTaskCount"
const SIDEBAR_LEFT_OPEN_KEY = "sidebarLeftOpen"
const SIDEBAR_RIGHT_OPEN_KEY = "sidebarRightOpen"
const AUDIOPLAYER_POSITION_KEY = "audioPlayerPosition"
const WORKSPACE_VIEW_KEY = "workspaceView"
const REOPEN_NOTES_KEY = "reopenNotes"
const SIDEBAR_ITEM_SIZE_KEY = "sidebarItemSize"

export type WorkspaceView = "grid" | "list"
export type SidebarItemSize = "compact" | "normal" | "large"


/**
 * Gets the value of the show progress bar preference.
 * @returns A boolean indicating whether the progress bar should be shown.
 * @category Store
 */
export const getShowProgressBar = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SHOW_PROGRESSBAR_KEY)
    return value ?? true
}

/**
 * Saves the value of the show progress bar preference.
 * @param value A boolean indicating whether to show the progress bar.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveShowProgressBar = async (value: boolean): Promise<void> => {
    await store.set(SHOW_PROGRESSBAR_KEY, value)
    await store.save()
}

/**
 * Gets the primary color preference.
 * If no value is set, it defaults to "#ffb375".
 * @returns A promise that resolves to the primary color hex code.
 * @category Store
 */
export const getPrimaryColor = async (): Promise<string> => {
    const value = await store.get<{ hex: string }>(PRIMARY_COLOR_KEY)
    return value?.hex ?? "#ffb375"
}

/**
 * Saves the primary color preference.
 * @param hex A string representing the primary color in hex format.
 * @returns A promise that resolves when the primary color is saved.
 * @category Store
 */
export const savePrimaryColor = async (hex: string): Promise<void> => {
    await store.set(PRIMARY_COLOR_KEY, { hex })
    await store.save()
}

/**
 * Gets the value of the show section count preference.
 * @returns A promise that resolves to a boolean indicating whether the section count should be shown.
 * @category Store
 */
export const getShowSectionCount = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SHOW_SECTION_COUNT_KEY)
    return value ?? true
}

/**
 * Saves the value of the show section count preference.
 * @param value A boolean indicating whether to show the section count.
 * @category Store
 */
export const saveShowSectionCount = async (value: boolean): Promise<void> => {
    await store.set(SHOW_SECTION_COUNT_KEY, value)
    await store.save()
}

/**
 * Gets the value of the show task count preference.
 * @returns A promise that resolves to a boolean indicating whether the task count should be shown.
 * @category Store
 */
export const getShowTaskCount = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SHOW_TASK_COUNT_KEY)
    return value ?? true
}

/**
 * Saves the value of the show task count preference.
 * @param value A boolean indicating whether to show the task count.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveShowTaskCount = async (value: boolean): Promise<void> => {
    await store.set(SHOW_TASK_COUNT_KEY, value)
    await store.save()
}

/**
 * Gets the value of the show left sidebar preference.
 * @returns A promise that resolves to a boolean indicating whether the left sidebar is open.
 * @category Store
 */
export const getSideBarLeftOpen = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SIDEBAR_LEFT_OPEN_KEY)
    return value ?? true
}

/**
 * Saves the value of the show left sidebar preference.
 * @param value A boolean indicating whether to show the left sidebar.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveSideBarLeftOpen = async (value: boolean): Promise<void> => {
    await store.set(SIDEBAR_LEFT_OPEN_KEY, value)
    await store.save()
}

/**
 * Gets the value of the show right sidebar preference.
 * @returns A promise that resolves to a boolean indicating whether the right sidebar is open.
 * @category Store
 */
export const getSideBarRightOpen = async (): Promise<boolean> => {
    const value = await store.get<boolean>(SIDEBAR_RIGHT_OPEN_KEY)
    return value ?? true
}

/**
 * Saves the value of the show right sidebar preference.
 * @param value A boolean indicating whether to show the right sidebar.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveSideBarRightOpen = async (value: boolean): Promise<void> => {
    await store.set(SIDEBAR_RIGHT_OPEN_KEY, value)
    await store.save()
}

/**
 * Gets the current position of the audio player.
 * If no position is set, it defaults to { x: 0, y: 0, scaleX: 1, scaleY: 1 }.
 * @returns A promise that resolves to an object containing the audio player's position and scale.
 * @category Store
 */
export const getAudioPlayerPosition = async (): Promise<AudioPlayerPosition> => {
    const value = await store.get<AudioPlayerPosition>(AUDIOPLAYER_POSITION_KEY)
    return value ?? { x: 0, y: 0, scaleX: 1, scaleY: 1 }
}

/**
 * Saves the current position of the audio player.
 * @param position An object containing the audio player's position and scale.
 * @returns A promise that resolves when the position is saved.
 * @category Store
 */
export const saveAudioPlayerPosition = async (position: AudioPlayerPosition): Promise<void> => {
    await store.set(AUDIOPLAYER_POSITION_KEY, position)
    await store.save()
}

/**
 * Resets the audio player position to its default state.
 * @returns A promise that resolves when the audio player position is reset.
 * @category Store
 */
export const resetAudioPlayerPosition = async (): Promise<void> => {
    await store.delete(AUDIOPLAYER_POSITION_KEY)
    await store.save()
}

/**
 * Gets the layout used to display the workspaces on the start page.
 * @returns A promise that resolves to "grid" (default) or "list".
 * @category Store
 */
export const getWorkspaceView = async (): Promise<WorkspaceView> => {
    const value = await store.get<WorkspaceView>(WORKSPACE_VIEW_KEY)
    return value === "list" ? "list" : "grid"
}

/**
 * Saves the layout used to display the workspaces on the start page.
 * @param value The view to save ("grid" or "list").
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveWorkspaceView = async (value: WorkspaceView): Promise<void> => {
    await store.set(WORKSPACE_VIEW_KEY, value)
    await store.save()
}

/**
 * Gets the value of the "reopen the notes at startup" preference.
 * @returns A promise that resolves to a boolean indicating whether the open notes must be restored (default true).
 * @category Store
 */
export const getReopenNotes = async (): Promise<boolean> => {
    const value = await store.get<boolean>(REOPEN_NOTES_KEY)
    return value ?? true
}

/**
 * Saves the value of the "reopen the notes at startup" preference.
 * @param value A boolean indicating whether the open notes must be restored at startup.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveReopenNotes = async (value: boolean): Promise<void> => {
    await store.set(REOPEN_NOTES_KEY, value)
    await store.save()
}

/**
 * Gets the size of the folder and note rows in the left sidebar.
 * @returns A promise that resolves to "compact", "normal" (default) or "large"; unknown stored values fall back to "normal".
 * @category Store
 */
export const getSidebarItemSize = async (): Promise<SidebarItemSize> => {
    const value = await store.get<SidebarItemSize>(SIDEBAR_ITEM_SIZE_KEY)
    return value === "compact" || value === "large" ? value : "normal"
}

/**
 * Saves the size of the folder and note rows in the left sidebar.
 * @param value The size to save ("compact", "normal" or "large").
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveSidebarItemSize = async (value: SidebarItemSize): Promise<void> => {
    await store.set(SIDEBAR_ITEM_SIZE_KEY, value)
    await store.save()
}
