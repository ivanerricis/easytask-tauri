import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { selectReleaseNotes } from "@/lib/release-notes"

/** `code` spans of a line of release notes. */
const inline = (text: string): ReactNode[] =>
    text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 1
            ? <code key={i} className="rounded-xs bg-muted px-1 text-[0.85em]">{part.slice(1, -1)}</code>
            : part)

/**
 * The release notes of an update, in the language of the app (the section of the body that is in that language, see
 * {@link selectReleaseNotes}). Minimal rendering of the CHANGELOG text: "### " headings, "- " bullets and paragraphs;
 * anything else is shown as plain text.
 * @category Updater
 */
export const ReleaseNotes = ({ body }: { body: string }) => {
    const { i18n } = useTranslation()
    const notes = selectReleaseNotes(body, i18n.language === "it" ? "it" : "en")

    const blocks: ReactNode[] = []
    let items: string[] = []
    const flush = () => {
        if (items.length === 0) return
        const list = items
        blocks.push(<ul key={blocks.length} className="list-disc pl-5 flex flex-col gap-0.5">{list.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>)
        items = []
    }
    for (const raw of notes.split(/\r?\n/)) {
        const line = raw.trim()
        if (/^[-*] /.test(line)) { items.push(line.slice(2)); continue }
        flush()
        if (!line) continue
        const heading = /^#{1,6}\s+(.*)$/.exec(line)
        blocks.push(heading
            ? <p key={blocks.length} className="font-semibold mt-1">{inline(heading[1])}</p>
            : <p key={blocks.length}>{inline(line)}</p>)
    }
    flush()
    return <div className="flex flex-col gap-1 text-sm select-text">{blocks}</div>
}
