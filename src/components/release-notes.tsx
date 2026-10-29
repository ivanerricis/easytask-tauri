import { useMemo, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { selectReleaseNotes } from "@/lib/release-notes"
import { openExternalUrl } from "@/lib/updater"
import { getErrorMessage } from "@/lib/utils"

// `code`, **bold**, [text](url), *italic* and _italic_ (the underscore one only at word boundaries: snake_case stays as is)
const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*[^*\s](?:[^*]*[^*\s])?\*|(?<!\w)_[^_\s](?:[^_]*[^_\s])?_(?!\w))/g

/** Inline formatting of a line of release notes. */
const inline = (text: string, onLink: (url: string) => void): ReactNode[] =>
    text.split(INLINE).map((part, i) => {
        if (part.length > 2 && part.startsWith("`") && part.endsWith("`"))
            return <code key={i} className="rounded-xs bg-muted px-1 text-[0.85em]">{part.slice(1, -1)}</code>
        if (part.length > 4 && part.startsWith("**") && part.endsWith("**"))
            return <strong key={i}>{inline(part.slice(2, -2), onLink)}</strong>
        const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part)
        if (link)
            return (
                <a
                    key={i}
                    href={link[2]}
                    className="text-primary underline underline-offset-2 rounded-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    onClick={e => { e.preventDefault(); onLink(link[2]) }}
                >
                    {link[1]}
                </a>
            )
        if (part.length > 2 && ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))))
            return <em key={i}>{inline(part.slice(1, -1), onLink)}</em>
        return part
    })

type Item = { text: string, nested: boolean }

/**
 * The release notes of an update, in the language of the app (the section of the body that is in that language, see
 * {@link selectReleaseNotes}). Minimal rendering of the CHANGELOG text: "### " headings, "- " bullets (one level of
 * nesting), paragraphs, `code`, **bold**, *italic* and [links](https://...) (opened in the browser, never in the webview);
 * anything else is shown as plain text.
 * @category Updater
 */
export const ReleaseNotes = ({ body }: { body: string }) => {
    const { t, i18n } = useTranslation()
    const language = i18n.language === "it" ? "it" : "en"
    const blocks = useMemo(() => {
        const notes = selectReleaseNotes(body, language)
        const onLink = (url: string) => {
            openExternalUrl(url).catch(error => toast.error(t("settings.about.openError", { message: getErrorMessage(error) })))
        }

        const blocks: ReactNode[] = []
        let items: Item[] = []
        const flush = () => {
            if (items.length === 0) return
            const rows: ReactNode[] = []
            for (let i = 0; i < items.length; i++) {
                // Nested items follow their parent; one with no parent (first of the list) is shown as a top-level one
                const parent = items[i]
                const children: Item[] = []
                while (i + 1 < items.length && items[i + 1].nested) children.push(items[++i])
                rows.push(
                    <li key={rows.length}>
                        {inline(parent.text, onLink)}
                        {children.length > 0 && (
                            <ul className="list-[circle] pl-5 flex flex-col gap-0.5">
                                {children.map((child, j) => <li key={j}>{inline(child.text, onLink)}</li>)}
                            </ul>
                        )}
                    </li>)
            }
            blocks.push(<ul key={blocks.length} className="list-disc pl-5 flex flex-col gap-0.5">{rows}</ul>)
            items = []
        }
        for (const raw of notes.split(/\r?\n/)) {
            const bullet = /^(\s*)[-*] (.*)$/.exec(raw)
            if (bullet) { items.push({ text: bullet[2].trim(), nested: bullet[1].length >= 2 }); continue }
            flush()
            const line = raw.trim()
            if (!line) continue
            const heading = /^#{1,6}\s+(.*)$/.exec(line)
            blocks.push(heading
                ? <h4 key={blocks.length} className={blocks.length > 0 ? "font-semibold mt-2" : "font-semibold"}>{inline(heading[1], onLink)}</h4>
                : <p key={blocks.length}>{inline(line, onLink)}</p>)
        }
        flush()
        return blocks
    }, [body, language, t])
    return <div className="flex flex-col gap-1 text-sm select-text">{blocks}</div>
}
