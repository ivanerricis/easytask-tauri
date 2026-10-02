import TextareaAutosize from "react-textarea-autosize"
import { cn } from "@/lib/utils"

type AutoTextareaProps = React.ComponentProps<"textarea"> & { minRows?: number }

/** The browser sizes a textarea to its text by itself (`field-sizing: content`): no script, no layout measure. */
const nativeSizing = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("field-sizing", "content")

/**
 * A textarea as tall as its text. It uses `field-sizing: content` where the webview has it, and falls back to
 * `react-textarea-autosize` elsewhere: that one measures every textarea with a forced layout, which is quadratic on a
 * page with hundreds of them (a note with 400 tasks took half a minute to open).
 * @category Components
 */
export function AutoTextarea({ minRows = 1, className, ...props }: AutoTextareaProps) {
    if (nativeSizing) return <textarea rows={minRows} className={cn("[field-sizing:content]", className)} {...props} />
    return <TextareaAutosize minRows={minRows} className={className} {...props as React.ComponentProps<typeof TextareaAutosize>} />
}
