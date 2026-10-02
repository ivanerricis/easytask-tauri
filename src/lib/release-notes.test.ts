import { describe, expect, it } from "vitest"
import { selectReleaseNotes } from "./release-notes"

const body = [
    "## English",
    "",
    "### Added",
    "",
    "- A new thing.",
    "",
    "## Italiano",
    "",
    "### Aggiunto",
    "",
    "- Una cosa nuova.",
].join("\n")

describe("selectReleaseNotes", () => {
    it("gives the section in the language of the app", () => {
        expect(selectReleaseNotes(body, "en")).toBe("### Added\n\n- A new thing.")
        expect(selectReleaseNotes(body, "it")).toBe("### Aggiunto\n\n- Una cosa nuova.")
    })

    it("does not carry the heading of the language or the other language", () => {
        const notes = selectReleaseNotes(body, "it")
        expect(notes).not.toContain("## Italiano")
        expect(notes).not.toContain("English")
        expect(notes).not.toContain("A new thing")
    })

    it("falls back to the English section when the language has none", () => {
        const onlyEnglish = "## English\n\n- A new thing.\n"
        expect(selectReleaseNotes(onlyEnglish, "it")).toBe("- A new thing.")
    })

    it("falls back to the other section when English is missing or empty", () => {
        expect(selectReleaseNotes("## Italiano\n\n- Una cosa.\n", "en")).toBe("- Una cosa.")
        expect(selectReleaseNotes("## English\n\n## Italiano\n\n- Una cosa.\n", "en")).toBe("- Una cosa.")
    })

    it("is one text for everybody when there are no language sections (the older releases)", () => {
        const legacy = "### Added\n\n- Hide completed tasks.\n"
        expect(selectReleaseNotes(legacy, "it")).toBe("### Added\n\n- Hide completed tasks.")
        expect(selectReleaseNotes(legacy, "en")).toBe("### Added\n\n- Hide completed tasks.")
    })

    it("does not take a deeper heading for a language section", () => {
        const text = "## English\n\n### Italiano\n\n- x\n"
        expect(selectReleaseNotes(text, "en")).toBe("### Italiano\n\n- x")
    })

    it("accepts Windows line endings, extra spaces and any case in the headings", () => {
        const crlf = "##  english  \r\n\r\n- One\r\n\r\n## ITALIANO\r\n\r\n- Uno\r\n"
        expect(selectReleaseNotes(crlf, "en")).toBe("- One")
        expect(selectReleaseNotes(crlf, "it")).toBe("- Uno")
    })

    it("drops the text that comes before the first language section", () => {
        expect(selectReleaseNotes("Intro\n\n## English\n\n- One\n", "en")).toBe("- One")
    })

    it("is empty for an empty body", () => {
        expect(selectReleaseNotes("", "en")).toBe("")
        expect(selectReleaseNotes("  \n ", "it")).toBe("")
    })
})
