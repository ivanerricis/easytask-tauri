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

export function ComboboxWorkspace() {
    const { t } = useTranslation()
    const [open, setOpen] = React.useState(false)
    const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace()
    const { getWorkspaceData } = useWorkspaceData()
    const [value, setValue] = React.useState(currentWorkspace?.name)

    const handleSelect = async (selectedValue: string) => {
        const selectedWorkspace = workspaces.find(ws => ws.name === selectedValue)
        if (selectedWorkspace) {
            setValue(selectedValue)
            setCurrentWorkspace(selectedWorkspace)
            await getWorkspaceData(selectedWorkspace.id)
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
                    className="justify-between opacity-50 hover:opacity-100 rounded-xs border !px-2.5"
                >
                    <div className="flex items-center gap-2">
                        <Box />
                        {value || t("workspace.combobox.select")}
                    </div>
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder={t("workspace.combobox.search")} />
                    <CommandList>
                        <CommandEmpty>{t("workspace.combobox.empty")}</CommandEmpty>
                        <CommandGroup>
                            {workspaces.map((workspace) => (
                                <CommandItem
                                    key={workspace.id}
                                    value={workspace.name}
                                    onSelect={() => handleSelect(workspace.name)}
                                >
                                    <CheckIcon
                                        className={cn(
                                            "h-4 w-4",
                                            value === workspace.name ? "opacity-100" : "opacity-0"
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