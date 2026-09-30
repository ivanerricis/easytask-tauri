import { useActiveNoteId } from "@/contexts/tabs-context"
import { GroupContainer } from "./groups/GroupContainer"
import { NoteList } from "./note/NoteList"
import { BlankNote } from "./BlankNote"

export const CenterContainer = () => {
    const activeId = useActiveNoteId()

    return (
        <div className="flex flex-col w-full overflow-hidden relative">
            {activeId !== null && <NoteList />}
            {activeId !== null ? <GroupContainer /> : <BlankNote />}
        </div >
    )
}