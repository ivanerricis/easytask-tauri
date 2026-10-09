import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { useDelayedFlag } from "@/hooks/use-delayed-flag"

/** Sections and tasks of each skeleton group: varied, so it reads as a note and not as a grid. */
const SHAPE = [[3, 2], [4], [2, 3]] as const

/**
 * Shown while a note opened for the first time loads (an already visited note comes from the cache at once): columns shaped
 * like its groups instead of an empty note. Drawn only when the load lasts long enough to be noticed.
 */
export const NoteSkeleton = () => {
    const { t } = useTranslation()
    const shown = useDelayedFlag(true)
    return (
        <div role="status" className="flex w-full h-full items-start p-2 space-x-2 overflow-hidden">
            <span className="sr-only">{t("common.loading")}</span>
            {shown && SHAPE.map((sections, group) => (
                <div key={group} aria-hidden className="flex flex-col gap-1 w-[280px] shrink-0">
                    <div className="flex items-center gap-2 border rounded-xs px-1.5 py-1 h-8">
                        <Skeleton className="size-5" />
                        <Skeleton className="h-3.5 w-1/3" />
                        <Skeleton className="ml-auto h-2 w-16" />
                    </div>
                    {sections.map((tasks, section) => (
                        <div key={section} className="flex flex-col border rounded-xs">
                            <div className="flex items-center gap-2 px-1.5 py-1 h-8 border-b">
                                <Skeleton className="h-3.5 w-2/5" />
                            </div>
                            {Array.from({ length: tasks }, (_, task) => (
                                <div key={task} className="flex items-center gap-2 px-1 py-1.5 ml-4 border-b last:border-b-0">
                                    <Skeleton className="size-4 shrink-0" />
                                    <Skeleton className="h-3.5" style={{ width: `${55 + ((group + section + task) % 3) * 15}%` }} />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}
