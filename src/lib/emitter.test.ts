import { describe, expect, it, vi } from "vitest"
import { createEmitter } from "./emitter"

describe("createEmitter", () => {
    it("calls every subscribed listener on emit", () => {
        const { subscribe, emit } = createEmitter()
        const a = vi.fn(), b = vi.fn()
        subscribe(a); subscribe(b)
        emit()
        expect(a).toHaveBeenCalledTimes(1)
        expect(b).toHaveBeenCalledTimes(1)
    })

    it("stops calling a listener once unsubscribed", () => {
        const { subscribe, emit } = createEmitter()
        const a = vi.fn()
        const off = subscribe(a)
        off()
        emit()
        expect(a).not.toHaveBeenCalled()
    })
})
