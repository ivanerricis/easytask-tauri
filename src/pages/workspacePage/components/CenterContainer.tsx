import { useActiveNoteId } from "@/contexts/use-tabs"
import { GroupContainer } from "./groups/GroupContainer"
import { NoteList } from "./note/NoteList"
import { BlankNote } from "./BlankNote"
import { PathBar } from "./PathBar"
import { NoteSearchProvider } from "./note-search-context"

export const CenterContainer = () => {
    const activeId = useActiveNoteId()

    return (
        <div className="flex flex-col w-full min-w-0 overflow-hidden relative">
            {activeId !== null && <NoteList />}
            {activeId !== null
                ? <NoteSearchProvider><PathBar /><GroupContainer /></NoteSearchProvider>
                : <BlankNote />}
        </div >
    )
}