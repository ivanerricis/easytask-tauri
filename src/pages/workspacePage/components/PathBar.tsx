import { Fragment, useMemo, useRef, useSyncExternalStore } from "react"
import { useTranslation } from "react-i18next"
import { Eye, EyeOff, Search } from "lucide-react"
import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import {
    Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useActiveNoteId } from "@/contexts/use-tabs"
import { usePreferences } from "@/contexts/use-preferences"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useShortcut } from "@/hooks/use-shortcut"
import { focusRing } from "@/lib/a11y"
import { requestTreeReveal } from "@/lib/tree-reveal"
import { cn } from "@/lib/utils"
import { getNotePath, type NotePathSegment } from "./sidebar/note-path"
import { NoteSearchField } from "./NoteSearchField"
import { useNoteSearchStore } from "./note-search-context"

/** With more segments than this, only the first and the last two are shown, with an ellipsis between them. */
const MAX_SEGMENTS = 4

const shortenPath = (path: NotePathSegment[]): (NotePathSegment | null)[] =>
    path.length > MAX_SEGMENTS ? [path[0], null, ...path.slice(-2)] : path

const NEVER = () => () => {}

/**
 * The bar between the tabs and the groups: the path of the open note (each segment shows its item in the sidebar) and, on
 * the right, the buttons that act on the whole note.
 */
export const PathBar = () => {
    const { t } = useTranslation()
    const activeId = useActiveNoteId()
    const { workspaceDataTree } = useWorkspaceData()
    const { hideCompletedTasks, setHideCompletedTasks } = usePreferences()
    const hideLabel = useShortcutLabel("toggle-hide-completed")
    const searchLabel = useShortcutLabel("search-in-note")
    const search = useNoteSearchStore()
    const searchOpen = useSyncExternalStore(search?.subscribe ?? NEVER, () => search?.getState().open ?? false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Registered once: the bar exists while a note is open, whatever the number of tabs
    useShortcut("toggle-hide-completed", () => setHideCompletedTasks(!hideCompletedTasks), { allowInInputs: true })

    // Opens the search field (it takes the focus when it appears); already open, it takes the focus and selects the query
    useShortcut("search-in-note", () => {
        if (!search) return
        if (search.getState().open) {
            searchInputRef.current?.focus()
            searchInputRef.current?.select()
        } else search.open()
    }, { allowInInputs: true })

    const segments = useMemo(() => {
        if (activeId === null || !workspaceDataTree) return []
        const tree = { rootFolders: workspaceDataTree.rootFolders ?? [], rootNotes: workspaceDataTree.rootNotes ?? [] }
        return shortenPath(getNotePath(tree, activeId))
    }, [activeId, workspaceDataTree])

    return (
        <div className="flex h-8 shrink-0 items-center gap-2 border-b px-2">
            <Breadcrumb aria-label={t("notes.path.label")} className="min-w-0 flex-1">
                <BreadcrumbList className="flex-nowrap gap-1 text-xs sm:gap-1">
                    {segments.map((segment, index) => (
                        <Fragment key={segment ? `${segment.type}-${segment.id}` : "ellipsis"}>
                            {index > 0 && <BreadcrumbSeparator className="shrink-0" />}
                            {segment ? (
                                <BreadcrumbItem className="min-w-0">
                                    <BreadcrumbLink asChild>
                                        <button
                                            type="button"
                                            title={segment.name}
                                            aria-label={t("notes.path.reveal", { name: segment.name })}
                                            aria-current={segment.type === "note" ? "page" : undefined}
                                            onClick={() => requestTreeReveal({ type: segment.type, id: segment.id })}
                                            className={cn(focusRing, "min-w-0 cursor-pointer truncate rounded-xs px-1", segment.type === "note" && "font-medium text-foreground")}
                                        >
                                            {segment.name}
                                        </button>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            ) : (
                                <BreadcrumbItem><BreadcrumbEllipsis className="size-5" /></BreadcrumbItem>
                            )}
                        </Fragment>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>
            {/* More buttons can be added here */}
            <div className="ml-auto flex shrink-0 items-center gap-1">
                {search && (searchOpen
                    ? <NoteSearchField store={search} inputRef={searchInputRef} />
                    : <TooltipCustom text={t("notes.noteSearch.inNote")} shortcut={searchLabel}>
                        <Button type="button" variant="ghost" size="icon" className="size-6 [&_svg]:!size-4"
                            aria-label={t("notes.noteSearch.inNote")} onClick={() => search.open()}>
                            <Search />
                        </Button>
                    </TooltipCustom>)}
                <TooltipCustom text={t("notes.hideCompleted")} shortcut={hideLabel}>
                    <Toggle
                        aria-label={t("notes.hideCompleted")}
                        pressed={hideCompletedTasks}
                        onPressedChange={setHideCompletedTasks}
                        className="size-6 min-w-6 p-0"
                    >
                        {hideCompletedTasks ? <EyeOff /> : <Eye />}
                    </Toggle>
                </TooltipCustom>
            </div>
        </div>
    )
}
