import type { Group, Section } from "@/types/types"
import { clampIndex } from "@/lib/number"

/**
 * True for the hidden default section of a group (the one holding the tasks created directly in the group).
 * The flag is a boolean in the app and 0/1 when it comes straight from SQLite.
 * @category Lib
 */
export function isDefaultSection(section: Pick<Section, "is_default"> | null | undefined): boolean {
    return section?.is_default === true || section?.is_default === 1
}

/**
 * Where the list of the direct tasks sits among the sections with a header: the number of them that come before it
 * (`defaultIndex`, clamped to 0..sections.length; absent = 0, on top).
 * @category Lib
 */
export function directIndexOf(group: Pick<Group, "defaultIndex" | "sections">): number {
    return clampIndex(group.defaultIndex ?? 0, group.sections.length)
}

/**
 * Every section that holds tasks, in display order: the sections with a header, with the default section (the list of the
 * direct tasks, when the group has one) inserted at `defaultIndex`.
 * @category Lib
 */
export function orderedItems(group: Pick<Group, "defaultSection" | "defaultIndex" | "sections">): Section[] {
    const items = [...group.sections]
    if (group.defaultSection) items.splice(directIndexOf(group), 0, group.defaultSection)
    return items
}

/**
 * Every section that holds tasks, in the order of the group (see {@link orderedItems}).
 * @category Lib
 */
export function taskSections(group: Pick<Group, "defaultSection" | "defaultIndex" | "sections">): Section[] {
    return orderedItems(group)
}

/**
 * The `defaultIndex` after a section with a header is inserted at `index` among the sections (before the `index`-th one, in
 * the order of the database: a section inserted exactly where the list is goes after the list, unless `beforeList` is set:
 * then it goes right before the list, which is pushed down by one place).
 * @category Lib
 */
export function defaultIndexAfterInsert(defaultIndex: number, index: number, beforeList = false): number {
    const at = Math.max(0, Math.trunc(index) || 0)
    return at < defaultIndex || (beforeList && at === defaultIndex) ? defaultIndex + 1 : defaultIndex
}

/**
 * The groups of a note in display order (by `position`), as a new array.
 * @category Lib
 */
export function groupsByPosition<T extends Pick<Group, "position">>(groups: readonly T[]): T[] {
    return [...groups].sort((a, b) => a.position - b.position)
}
