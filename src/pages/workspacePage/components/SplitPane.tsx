import { useTranslation } from "react-i18next"
import { useActiveNoteId } from "@/contexts/use-tabs"
import { useLayoutActions, usePane } from "@/contexts/use-layout"
import type { PaneIndex } from "@/contexts/layout-reducer"
import { MIN_PANE_WIDTH } from "@/lib/split-layout"
import { cn } from "@/lib/utils"
import { GroupContainer } from "./groups/GroupContainer"
import { NoteList } from "./note/NoteList"
import { EmptyPane } from "./EmptyPane"
import { PathBar } from "./PathBar"
import { NoteSearchProvider } from "./note-search-context"

type SplitPaneProps = {
    pane: PaneIndex
    /** Share of the container width given to this pane. */
    share: number
}

/**
 * One of the two panes of the split workspace: its tab bar and its note (or the empty placeholder). It must be rendered
 * inside the `PaneProvider` of the same pane, whose root ref it attaches. A press or the focus inside it gives it the focus.
 */
export const SplitPane = ({ pane, share }: SplitPaneProps) => {
    const { t } = useTranslation()
    const activeId = useActiveNoteId()
    const { focusPane } = useLayoutActions()
    const { rootRef, focused, isFocused } = usePane()!

    const claimFocus = () => { if (!isFocused()) focusPane(pane) }

    return (
        <div
            ref={rootRef}
            role="region"
            aria-label={t(pane === 0 ? "notes.split.leftPane" : "notes.split.rightPane")}
            data-pane={pane}
            data-focused={focused}
            className={cn(
                "relative flex min-w-0 flex-col overflow-hidden border-t-2 border-t-transparent",
                focused && "border-t-primary",
            )}
            style={{ flexBasis: `${share * 100}%`, flexGrow: 0, minWidth: MIN_PANE_WIDTH }}
            onPointerDownCapture={claimFocus}
            onFocusCapture={claimFocus}
        >
            <NoteList />
            {activeId !== null
                ? <NoteSearchProvider><PathBar /><GroupContainer /></NoteSearchProvider>
                : <EmptyPane pane={pane} />}
        </div>
    )
}
