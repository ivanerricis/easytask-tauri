export const ROW_SELECTOR = "[data-row-key]"
const rowSelector = (key: string) => `[data-row-key="${key}"]`

/** Frames to wait for a row to mount (folders animate open, a virtualized row mounts after the scroll). */
const ROW_MOUNT_MAX_FRAMES = 20

type WhenRowMountedOptions = {
    /** Look for the row right away, not only from the next frame. */
    immediate?: boolean
    /** Called when the row did not mount in time. */
    onTimeout?: () => void
}

/**
 * Calls `callback` with the row of the tree that has this key as soon as it is in the DOM, waiting at most a bounded number of
 * frames for it to mount. Returns the function that cancels the wait.
 */
export const whenRowMounted = (
    root: ParentNode | null,
    key: string,
    callback: (row: HTMLElement) => void,
    { immediate = false, onTimeout }: WhenRowMountedOptions = {},
): (() => void) => {
    let frame = 0
    let tries = 0
    const step = () => {
        const row = root?.querySelector<HTMLElement>(rowSelector(key))
        if (row) callback(row)
        else if (++tries < ROW_MOUNT_MAX_FRAMES) frame = requestAnimationFrame(step)
        else onTimeout?.()
    }
    if (immediate) step()
    else frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
}
