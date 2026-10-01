import type { KeyboardEvent } from "react";

/** Keyboard handler that runs `handler` on Enter/Space, only when the event targets the element itself. */
export function onActivateKey<T extends HTMLElement>(handler: (e: KeyboardEvent<T>) => void) {
    return (e: KeyboardEvent<T>) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handler(e);
        }
    };
}

export const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
