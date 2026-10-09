import i18n from "@/i18n"

/**
 * Label of a section: its title, or "Sezione senza titolo" when it has none.
 * @category Note
 */
export function getSectionLabel(section: { title?: string | null }): string {
    const title = section.title?.trim()
    return title ? title : i18n.t("sections.untitled")
}
