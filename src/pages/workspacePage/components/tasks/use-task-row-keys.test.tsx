import { renderHook } from "@testing-library/react"
import type { KeyboardEvent } from "react"
import { describe, expect, it } from "vitest"
import { useTaskRowKeys } from "./use-task-row-keys"

const treeHtml = (testId: string) => `
    <div role="tree" data-testid="${testId}">
        <div role="treeitem" aria-level="1" data-task-id="1" tabindex="0"></div>
        <div role="treeitem" aria-level="1" data-task-id="2" tabindex="-1"></div>
    </div>`

describe("useTaskRowKeys", () => {
    it("moves the focus inside its own list, even if another list has a row with the same id", () => {
        document.body.innerHTML = treeHtml("decoy") + treeHtml("own")
        const own = document.querySelector<HTMLElement>("[data-testid=own]")!
        const ownFirst = own.querySelector<HTMLElement>("[data-task-id='1']")!
        const ownSecond = own.querySelector<HTMLElement>("[data-task-id='2']")!
        const decoySecond = document.querySelector<HTMLElement>("[data-testid=decoy] [data-task-id='2']")!

        const { result } = renderHook(() => useTaskRowKeys({
            taskId: 1, taskText: "Uno", subtasksOpen: false, onToggleSubtasks: () => { }, onToggleCompleted: () => { }, onRename: () => { },
        }))
        result.current({ key: "ArrowDown", target: ownFirst, currentTarget: ownFirst, preventDefault: () => { } } as unknown as KeyboardEvent<HTMLElement>)

        expect(document.activeElement).toBe(ownSecond)
        expect(document.activeElement).not.toBe(decoySecond)
    })
})
