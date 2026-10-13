import type { AnimationSpeed } from "@/lib/store/preferences"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

/** The speed that "system" stands for: none when the operating system asks for reduced motion, normal otherwise. */
export const resolveAnimationSpeed = (speed: AnimationSpeed, reducedMotion: boolean): Exclude<AnimationSpeed, "system"> =>
    speed !== "system" ? speed : reducedMotion ? "none" : "normal"

/**
 * Applies the speed of the animations to the page: the stylesheet (index.css) reads the `data-motion` attribute of the root
 * element to scale the durations of the transitions and of the animations of the components, or to turn them off.
 * With "system" the attribute follows the operating system (in Windows: Settings > Accessibility > Visual effects > Animation
 * effects, which the webview reports as prefers-reduced-motion) and changes when the user changes it. Returns what stops that.
 */
export const applyAnimationSpeed = (speed: AnimationSpeed, root: HTMLElement = document.documentElement): (() => void) | void => {
    if (speed !== "system" || typeof window.matchMedia !== "function") {
        root.dataset.motion = resolveAnimationSpeed(speed, false)
        return
    }
    const query = window.matchMedia(REDUCED_MOTION)
    const apply = () => { root.dataset.motion = resolveAnimationSpeed(speed, query.matches) }
    apply()
    query.addEventListener("change", apply)
    return () => query.removeEventListener("change", apply)
}
