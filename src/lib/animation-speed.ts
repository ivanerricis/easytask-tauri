import type { AnimationSpeed } from "@/lib/store/preferences"

/**
 * Applies the speed of the animations to the page: the stylesheet (index.css) reads the `data-motion` attribute of the root
 * element to scale the durations of the transitions and of the animations of the components, or to turn them off.
 */
export const applyAnimationSpeed = (speed: AnimationSpeed, root: HTMLElement = document.documentElement): void => {
    root.dataset.motion = speed
}
