import { lazyWithPreload, preloadWhenIdle } from "@/lib/lazy-preload"

/** The automations dialog of a section or a group, loaded on demand (and preloaded once the app is idle). */
export const LazyDialogAutomations = lazyWithPreload(() => import("@/components/dialogs/dialog-automations").then(m => ({ default: m.DialogAutomations })))
preloadWhenIdle(LazyDialogAutomations)
