import { useTranslation } from "react-i18next"
import { ButtonInPopover } from "@/components/button-in-popover"
import { useLayoutActions, usePaneOfNote } from "@/contexts/use-layout"

/**
 * The menu entry that moves a note to the other pane: "Open on the right" (creates the split if needed and moves the note there),
 * or "Open on the left" when the note is in the right pane. It is also the keyboard way to move a note between the panes.
 * @category Tabs
 */
export const OpenInPaneItem = ({ noteId, onDone }: { noteId: number, onDone: () => void }) => {
    const { t } = useTranslation()
    const { openInPane, moveToPane } = useLayoutActions()
    const onRight = usePaneOfNote(noteId) === 1
    return onRight ? (
        <ButtonInPopover text={t("menu.openLeft")} type="openLeft" onClick={() => { moveToPane(noteId, 0); onDone() }} />
    ) : (
        <ButtonInPopover text={t("menu.openRight")} type="openRight" onClick={() => { openInPane(noteId, 1); onDone() }} />
    )
}
