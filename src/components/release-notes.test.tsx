import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import i18n from "@/i18n"
import { ReleaseNotes } from "./release-notes"

const body = [
    "## English",
    "",
    "### Added",
    "",
    "- Hide completed tasks (`Ctrl+Shift+H`).",
    "- Duplicate notes.",
    "",
    "## Italiano",
    "",
    "### Aggiunto",
    "",
    "- Nascondi i task completati (`Ctrl+Shift+H`).",
    "- Duplica le note.",
].join("\n")

afterEach(async () => { await act(() => i18n.changeLanguage("it")) })

describe("ReleaseNotes", () => {
    it("shows the notes in Italian when the app is in Italian", async () => {
        await act(() => i18n.changeLanguage("it"))
        render(<ReleaseNotes body={body} />)
        expect(screen.getByText("Aggiunto")).toBeInTheDocument()
        expect(screen.getByText("Duplica le note.")).toBeInTheDocument()
        expect(screen.queryByText("Duplicate notes.")).not.toBeInTheDocument()
    })

    it("shows the notes in English when the app is in English", async () => {
        await act(() => i18n.changeLanguage("en"))
        render(<ReleaseNotes body={body} />)
        expect(screen.getByText("Added")).toBeInTheDocument()
        expect(screen.getByText("Duplicate notes.")).toBeInTheDocument()
        expect(screen.queryByText("Duplica le note.")).not.toBeInTheDocument()
    })

    it("follows a change of language while it is shown", async () => {
        await act(() => i18n.changeLanguage("it"))
        render(<ReleaseNotes body={body} />)
        expect(screen.getByText("Duplica le note.")).toBeInTheDocument()
        await act(() => i18n.changeLanguage("en"))
        expect(screen.getByText("Duplicate notes.")).toBeInTheDocument()
    })

    it("renders headings, bullets and code, with no trace of the language headings", async () => {
        await act(() => i18n.changeLanguage("en"))
        const { container } = render(<ReleaseNotes body={body} />)
        expect(screen.getAllByRole("listitem")).toHaveLength(2)
        expect(screen.getByText("Ctrl+Shift+H").tagName).toBe("CODE")
        expect(container).not.toHaveTextContent("Italiano")
        expect(container).not.toHaveTextContent("English")
    })

    it("shows an older release, written in one language only, to everybody", async () => {
        await act(() => i18n.changeLanguage("it"))
        render(<ReleaseNotes body={"### Added\n\n- Hide completed tasks.\n"} />)
        expect(screen.getByText("Hide completed tasks.")).toBeInTheDocument()
    })
})
