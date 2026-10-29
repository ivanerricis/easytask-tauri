/** Horizontal drop zone: left half of the rect = before, right half = after. */
export const halfZone = (rect: { left: number, width: number }, pointerX: number): "before" | "after" =>
    (pointerX - rect.left) / (rect.width || 1) < 0.5 ? "before" : "after"
