import { getClientRect, type DndContextProps } from "@dnd-kit/core"

/**
 * The floating player is placed with a transform only: the default (transform-agnostic) measure of dnd-kit would drop that base
 * position from the rect used by restrictToParentElement, so the clamp has to measure the real (visual) rectangle.
 */
export const AUDIO_PLAYER_MEASURING: DndContextProps["measuring"] = { draggable: { measure: getClientRect } }
