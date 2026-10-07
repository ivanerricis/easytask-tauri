export type TabZone = "before" | "after"

/** Left half of a tab = before, right half = after. */
export const computeTabZone = (rect: { left: number, width: number }, pointerX: number): TabZone =>
    (pointerX - rect.left) / (rect.width || 1) < 0.5 ? "before" : "after"

/**
 * Computes the `reorderTabs(from, to)` arguments for a tab dropped before/after another one
 * (`to` is the final index of the moved tab). Null when nothing changes.
 */
export function computeTabMove(ids: number[], activeId: number, overId: number, zone: TabZone): { from: number, to: number } | null {
    const from = ids.indexOf(activeId)
    if (from < 0 || activeId === overId) return null
    const overIndex = ids.filter(id => id !== activeId).indexOf(overId)
    if (overIndex < 0) return null
    const to = zone === "after" ? overIndex + 1 : overIndex
    return to === from ? null : { from, to }
}

/**
 * The tab a drag at horizontal position `x` is over: the one under it, else the first (pointer before the bar) or
 * the last (pointer past it, in the empty part of the bar or outside) so that a tab can be dropped at either end.
 */
export function pickTabByX<T extends string | number>(tabs: { id: T, left: number, right: number }[], x: number): T | null {
    if (tabs.length === 0) return null
    const under = tabs.find(tab => x >= tab.left && x <= tab.right)
    if (under) return under.id
    const first = tabs.reduce((a, b) => b.left < a.left ? b : a)
    if (x < first.left) return first.id
    return tabs.reduce((a, b) => b.right > a.right ? b : a).id
}
