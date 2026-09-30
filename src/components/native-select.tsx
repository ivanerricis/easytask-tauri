import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Native select styled like the shadcn Input.
 * @category Components
 */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
    return (
        <select
            data-slot="native-select"
            className={cn(
                "border-input dark:bg-input/30 flex h-9 w-full min-w-0 rounded-xs border bg-transparent px-2 py-1 text-base shadow-xs outline-none md:text-md",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    )
}
