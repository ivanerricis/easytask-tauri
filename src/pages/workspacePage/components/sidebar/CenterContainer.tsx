import { useActiveNoteId } from "@/contexts/use-tabs"
import { GroupContainer } from "../groups/GroupContainer"
import { NoteList } from "../note/NoteList"
import { BlankNote } from "../BlankNote"

export const CenterContainer = () => {

    const activeId = useActiveNoteId()

    return (
        <div className="flex flex-col w-full overflow-x-auto overflow-y-hidden">
            <NoteList />
            {activeId !== null ? <GroupContainer /> : <BlankNote />}
        </div>
    )
}