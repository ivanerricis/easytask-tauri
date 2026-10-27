import type { TaskKeyRow } from "./task-keyboard"

/** The task rows (treeitems) of a task list in drawing order, as the keyboard sees them: only what is on screen. */
export function readTaskRows(tree: Element): TaskKeyRow[] {
    const rows: TaskKeyRow[] = []
    const parents: string[] = []
    tree.querySelectorAll<HTMLElement>("[role='treeitem'][data-task-id]").forEach(item => {
        const level = Number(item.getAttribute("aria-level")) || 1
        // The parent is the nearest row above with one level less
        parents.length = level - 1
        const expanded = item.getAttribute("aria-expanded")
        const key = item.dataset.taskId as string
        rows.push({ key, level, parentKey: level > 1 ? (parents[level - 2] ?? null) : null, hasChildren: expanded !== null, expanded: expanded === "true" })
        parents[level - 1] = key
    })
    return rows
}

/** Position (1-based) of a task among its siblings, and how many they are. */
export function siblingPosition(rows: TaskKeyRow[], key: string): { position: number, total: number } | null {
    const row = rows.find(candidate => candidate.key === key)
    if (!row) return null
    const siblings = rows.filter(candidate => candidate.parentKey === row.parentKey && candidate.level === row.level)
    return { position: siblings.findIndex(candidate => candidate.key === key) + 1, total: siblings.length }
}
