import { describe, expect, it, vi } from "vitest"

const openUrl = vi.fn(() => Promise.resolve())
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl }))

const { DOCS_URL, docsUrl, openDocs } = await import("./docs")

describe("docs", () => {
    it("points to the Italian pages when the UI is in Italian", () => {
        expect(docsUrl("it")).toBe(`${DOCS_URL}it/`)
        expect(docsUrl("it-IT")).toBe(`${DOCS_URL}it/`)
    })

    it("points to the English pages for any other language", () => {
        expect(docsUrl("en")).toBe(DOCS_URL)
        expect(docsUrl("de")).toBe(DOCS_URL)
    })

    it("opens the page of the language in the browser", async () => {
        await openDocs("it")
        expect(openUrl).toHaveBeenCalledWith(`${DOCS_URL}it/`)
    })
})
