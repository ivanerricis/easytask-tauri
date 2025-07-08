import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { GroupContainer } from "./groups/GroupContainer"
import { NoteList } from "./note/NoteList"
import { BlankNote } from "./BlankNote"

export const CenterContainer = () => {

    const { currentNote } = useWorkspaceData()

    return (
        <div className="flex flex-col w-full overflow-x-auto overflow-y-hidden">
            <NoteList />
            {currentNote ? <GroupContainer /> : <BlankNote />}
        </div>
    )
}