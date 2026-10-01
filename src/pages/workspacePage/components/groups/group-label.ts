import i18n from "@/i18n"

/**
 * Label of a group: its name, or "Gruppo N" (N = display index + 1) when it has none.
 * @category Note
 */
export function getGroupLabel(group: { name?: string | null }, index: number): string {
    const name = group.name?.trim()
    return name ? name : i18n.t("groups.defaultLabel", { index: index + 1 })
}
