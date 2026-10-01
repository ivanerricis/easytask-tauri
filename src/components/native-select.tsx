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
                "border-input bg-background text-foreground [color-scheme:light] dark:[color-scheme:dark] [&_option]:bg-popover [&_option]:text-popover-foreground flex h-9 w-full min-w-0 rounded-xs border px-2 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-md",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    )
}
