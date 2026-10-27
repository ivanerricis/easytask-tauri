import { useTranslation } from "react-i18next"
import * as React from "react"
import { Box, CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { reportError } from "@/lib/report-error"
import { getErrorMessage } from "@/lib/utils"
import type { Workspace } from "@/types/types"

export function ComboboxWorkspace() {
    const { t } = useTranslation()
    const [open, setOpen] = React.useState(false)
    const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace()
    const { getWorkspaceData } = useWorkspaceData()

    // The workspace is the one of the item (its id), not looked up by name: two workspaces can have the same name
    const handleSelect = async (workspace: Workspace) => {
        setCurrentWorkspace(workspace)
        try {
            await getWorkspaceData(workspace.id)
        } catch (err) {
            reportError(err, getErrorMessage(err))
        } finally {
            setOpen(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={currentWorkspace ? t("workspace.combobox.label", { name: currentWorkspace.name }) : t("workspace.combobox.select")}
                    className="justify-between max-w-full rounded-xs border !px-2.5"
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <Box className="shrink-0" />
                        <span className="min-w-0 truncate">{currentWorkspace?.name || t("workspace.combobox.select")}</span>
                    </div>
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0">
                <Command>
                    <CommandInput placeholder={t("workspace.combobox.search")} />
                    <CommandList>
                        <CommandEmpty>{t("workspace.combobox.empty")}</CommandEmpty>
                        <CommandGroup>
                            {workspaces.map((workspace) => (
                                <CommandItem
                                    key={workspace.id}
                                    value={`${workspace.name} ${workspace.id}`}
                                    onSelect={() => handleSelect(workspace)}
                                >
                                    <CheckIcon
                                        className={cn(
                                            "h-4 w-4",
                                            currentWorkspace?.id === workspace.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {workspace.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}