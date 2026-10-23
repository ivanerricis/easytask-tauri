import type { Group, Section } from "@/types/types"

/**
 * True for the hidden default section of a group (the one holding the tasks created directly in the group).
 * The flag is a boolean in the app and 0/1 when it comes straight from SQLite.
 * @category Lib
 */
export function isDefaultSection(section: Pick<Section, "is_default"> | null | undefined): boolean {
    return section?.is_default === true || section?.is_default === 1
}

/**
 * Every section that holds tasks, in display order: the default section first, then the normal ones.
 * @category Lib
 */
export function taskSections(group: Pick<Group, "defaultSection" | "sections">): Section[] {
    return [group.defaultSection, ...group.sections].filter((s): s is Section => Boolean(s))
}
