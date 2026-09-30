import { useState } from "react"
import { EllipsisVertical, Music } from "lucide-react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAudio, useGroupAudioFiles } from "@/contexts/audio-context"
import { cn } from "@/lib/utils"
import type { AudioFile } from "@/types/types"

type AudioFileRowProps = {
    file: AudioFile
    groupId: number
}

const AudioFileRow = ({ file, groupId }: AudioFileRowProps) => {
    const { track, playFile, relinkFile, refresh } = useAudio()
    const [isRenameOpen, setRenameOpen] = useState(false)
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const [dropDownOpen, setDropDownOpen] = useState(false)
    const isCurrent = track?.audioId === file.id

    // The dialogs call this with the id they were given after the change is stored
    const reload = async () => refresh()

    return (
        <>
            <div
                className={cn(
                    "group flex items-center gap-2 border px-2 py-1 bg-background hover:bg-secondary rounded-xs cursor-pointer text-xs",
                    isCurrent && "border-primary"
                )}
                role="button"
                tabIndex={0}
                title={file.path}
                onClick={() => void playFile(file)}
                onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        void playFile(file)
                    }
                }}
            >
                <Music className={cn("size-4 shrink-0", isCurrent ? "text-primary" : "text-muted-foreground")} />
                <span className="flex-1 truncate">{file.name}</span>
                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <DropdownMenu open={dropDownOpen} onOpenChange={setDropDownOpen}>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="Menu file audio"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-xs cursor-pointer"
                            >
                                <EllipsisVertical className="!h-4 !w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()} className="p-1 rounded-xs">
                            <DropdownMenuGroup className="flex flex-col gap-1">
                                <ButtonInPopover
                                    text="Rinomina"
                                    type="rename"
                                    onClick={() => {
                                        setRenameOpen(true)
                                        setDropDownOpen(false)
                                    }}
                                />
                                <ButtonInPopover
                                    text="Aggiorna percorso"
                                    type="move"
                                    onClick={() => {
                                        setDropDownOpen(false)
                                        void relinkFile(file)
                                    }}
                                />
                                <ButtonInPopover
                                    text="Elimina"
                                    type="delete"
                                    destructive
                                    onClick={() => {
                                        setDeleteOpen(true)
                                        setDropDownOpen(false)
                                    }}
                                />
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <DialogRenameItem
                item={file}
                itemType="audio_file"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
                getItemId={groupId}
                getItemData={reload}
            />
            <DialogDeleteItem
                item={file}
                itemType="audio_file"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                getItemId={groupId}
                getItemData={reload}
            />
        </>
    )
}

type GroupAudioFilesProps = {
    groupId: number
}

/**
 * Compact list of the audio files attached to a group. A file plays only when it is clicked.
 * @category Group
 */
export const GroupAudioFiles = ({ groupId }: GroupAudioFilesProps) => {
    const files = useGroupAudioFiles(groupId)
    if (files.length === 0) return null

    return (
        <div className="flex flex-col gap-1" aria-label="File audio">
            {files.map(file => (
                <AudioFileRow key={file.id} file={file} groupId={groupId} />
            ))}
        </div>
    )
}
