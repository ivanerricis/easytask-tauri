import { useTranslation } from "react-i18next"
import { useState } from "react"
import { AudioLines, Music, Pause, Square } from "lucide-react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { MenuGroup } from "@/components/menu-kind"
import { ItemMenu, ItemMenuButton } from "@/components/item-menu"
import { useItemMenuState } from "@/hooks/use-item-menu-state"
import { useAudio, useGroupAudioFiles } from "@/contexts/use-audio"
import { useShowAudioInfo } from "../rightbar/use-right-panel"
import { cn } from "@/lib/utils"
import { focusRing, onActivateKey } from "@/lib/a11y"
import type { AudioFile } from "@/types/types"

type AudioFileRowProps = {
    file: AudioFile
    groupId: number
}

const AudioFileRow = ({ file, groupId }: AudioFileRowProps) => {
    const { t } = useTranslation()
    const { track, playbackState, playFile, relinkFile, refresh } = useAudio()
    const [isRenameOpen, setRenameOpen] = useState(false)
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const menu = useItemMenuState()
    const showAudioInfo = useShowAudioInfo()
    const isCurrent = track?.audioId === file.id
    // What the icon says: playing (animated bars), paused (pause), played to the end (stop), or not loaded (note)
    const state = isCurrent ? playbackState : null
    const StateIcon = state === "playing" ? AudioLines : state === "paused" ? Pause : state === "ended" ? Square : Music

    // The dialogs call this with the id they were given after the change is stored
    const reload = async () => refresh()

    const items = (
        <MenuGroup className="flex flex-col gap-1">
            {showAudioInfo && (
                <ButtonInPopover
                    text={t("audio.info")}
                    type="details"
                    onClick={() => {
                        menu.close()
                        showAudioInfo(file)
                    }}
                />
            )}
            <ButtonInPopover
                text={t("common.rename")}
                type="rename"
                onClick={() => {
                    setRenameOpen(true)
                    menu.close()
                }}
            />
            <ButtonInPopover
                text={t("audio.updatePath")}
                type="relink"
                onClick={() => {
                    menu.close()
                    void relinkFile(file)
                }}
            />
            <ButtonInPopover
                text={t("common.delete")}
                type="delete"
                destructive
                onClick={() => {
                    setDeleteOpen(true)
                    menu.close()
                }}
            />
        </MenuGroup>
    )

    const dialogs = (
        <>
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

    return (
        <ItemMenu state={menu} items={items} dialogs={dialogs} contentClassName="p-1 rounded-xs">
            <div
                className={cn(
                    focusRing, "group flex items-center gap-2 border px-2 py-1 bg-background hover:bg-secondary rounded-xs cursor-pointer text-xs",
                    isCurrent && "border-primary"
                )}
                role="button"
                tabIndex={0}
                aria-current={isCurrent ? "true" : undefined}
                title={file.path}
                onClick={() => void playFile(file)}
                onKeyDown={onActivateKey(() => void playFile(file))}
            >
                <StateIcon className={cn("shrink-0", state === "ended" ? "size-3.5 mx-px fill-current" : "size-4", isCurrent ? "text-primary" : "text-muted-foreground", state === "playing" && "motion-safe:animate-pulse")} />
                <span className="flex-1 truncate">{file.name}</span>
                {state && <span className="sr-only">{t(`audio.${state === "playing" ? "nowPlaying" : state}`)}</span>}
                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <ItemMenuButton label={t("audio.fileMenu")} iconClassName="!h-4 !w-4" />
                </div>
            </div>
        </ItemMenu>
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
    const { t } = useTranslation()
    const files = useGroupAudioFiles(groupId)
    if (files.length === 0) return null

    return (
        <div className="flex flex-col gap-1" aria-label={t("audio.files")}>
            {files.map(file => (
                <AudioFileRow key={file.id} file={file} groupId={groupId} />
            ))}
        </div>
    )
}
