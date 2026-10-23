import { useActiveNoteId } from "@/contexts/use-tabs"
import { GroupContainer } from "./groups/GroupContainer"
import { NoteList } from "./note/NoteList"
import { BlankNote } from "./BlankNote"
import { PathBar } from "./PathBar"

export const CenterContainer = () => {
    const activeId = useActiveNoteId()

    return (
        <div className="flex flex-col w-full min-w-0 overflow-hidden relative">
            {activeId !== null && <NoteList />}
            {activeId !== null && <PathBar />}
            {activeId !== null ? <GroupContainer /> : <BlankNote />}
        </div >
    )
}