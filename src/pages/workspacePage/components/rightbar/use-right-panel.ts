import { useContext } from "react"
import { RightPanelContext } from "./right-panel-context-object"

/**
 * The right panel state.
 * @category RightPanel
 */
export const useRightPanel = () => {
    const context = useContext(RightPanelContext)
    if (!context) throw new Error("useRightPanel must be used within a RightPanelProvider")
    return context
}

/**
 * A function that selects a task and shows its details in the right panel, or undefined where there is no panel
 * (outside a RightPanelProvider).
 * @category RightPanel
 */
export const useShowTaskDetails = () => useContext(RightPanelContext)?.showTaskDetails

/**
 * A function that shows the information of an audio file in the right panel, or undefined where there is no panel
 * (outside a RightPanelProvider).
 * @category RightPanel
 */
export const useShowAudioInfo = () => useContext(RightPanelContext)?.showAudioInfo
