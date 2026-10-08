import { Fragment } from "react"
import { cn } from "@/lib/utils"

export const Kbd = ({ className, ...props }: React.ComponentProps<"kbd">) => (
    <kbd
        className={cn(
            "inline-flex items-center justify-center rounded-xs border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground",
            className
        )}
        {...props}
    />
)

export const KbdKeys = ({ keys, className }: { keys: string[], className?: string }) => (
    <span className={cn("inline-flex items-center gap-1", className)}>
        {keys.map((key, i) => (
            <Fragment key={i}>
                {i > 0 && <span aria-hidden className="text-xs text-muted-foreground">+</span>}
                <Kbd>{key}</Kbd>
            </Fragment>
        ))}
    </span>
)
