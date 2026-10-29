import { createWindowEvent } from "@/lib/window-event"

/** Window event fired to show an item in the sidebar tree (the component that owns the tree listens to it). */
export const TREE_REVEAL_EVENT = "easytask:tree-reveal"

type TreeRevealRef = { type: "folder" | "note", id: number }

const treeReveal = createWindowEvent<TreeRevealRef>(TREE_REVEAL_EVENT)

/** Asks the sidebar to open, expand the folders above the item and scroll to it. */
export const requestTreeReveal = treeReveal.emit

/**
 * Runs `handler` when a reveal is requested.
 * @category Sidebar
 */
export const useTreeRevealRequest = treeReveal.useListen
