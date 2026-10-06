import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AudioFile } from "@/types/types"
import { PreferencesProvider } from "@/contexts/preferences-context"
import { TabsProvider } from "@/contexts/tabs-context"
import { AudioContext, type AudioContextType } from "@/contexts/audio-context-object"
import { getDBGroupAudioFiles } from "@/db/queries/audio"
import { makeNote } from "@/test/ui-fixtures"
import { RightPanelProvider } from "./right-panel-context"
import { useRightPanel } from "./use-right-panel"

vi.mock("@/db/queries/audio", () => ({ getDBGroupAudioFiles: vi.fn() }))

const audioFile: AudioFile = { id: 7, section_groupID: 3, name: "a.mp3", path: "/m/a.mp3", position: 0, creation_date: "2026-01-01", creation_time: "00:00:00" }

function Probe() {
    const panel = useRightPanel()
    return (
        <>
            <output data-testid="state">{`${panel.open}|${panel.tab}|${panel.audioInfoFile?.name ?? "none"}|${panel.audioInfoFile?.path ?? ""}`}</output>
            <button onClick={() => panel.showAudioInfo(audioFile)}>info</button>
            <button onClick={() => panel.setTab("history")}>history</button>
        </>
    )
}

const renderProvider = (version: number) => {
    const ui = (v: number) => (
        <PreferencesProvider>
            <TabsProvider notes={[makeNote({ id: 1 })]} workspaceId={null}>
                <AudioContext.Provider value={{ version: v } as unknown as AudioContextType}>
                    <RightPanelProvider><Probe /></RightPanelProvider>
                </AudioContext.Provider>
            </TabsProvider>
        </PreferencesProvider>
    )
    const view = render(ui(version))
    return { rerenderWith: (v: number) => view.rerender(ui(v)) }
}

beforeEach(() => { vi.mocked(getDBGroupAudioFiles).mockReset() })

describe("RightPanelProvider audio information", () => {
    it("chooses the file from the menu: opens the panel on the details tab", async () => {
        vi.mocked(getDBGroupAudioFiles).mockResolvedValue([audioFile])
        renderProvider(0)
        await userEvent.click(screen.getByText("history"))
        await userEvent.click(screen.getByText("info"))
        expect(screen.getByTestId("state")).toHaveTextContent("true|details|a.mp3|/m/a.mp3")
    })

    it("goes back to the loaded track when the chosen file is deleted", async () => {
        vi.mocked(getDBGroupAudioFiles).mockResolvedValue([audioFile])
        const { rerenderWith } = renderProvider(0)
        await userEvent.click(screen.getByText("info"))
        vi.mocked(getDBGroupAudioFiles).mockResolvedValue([])
        await act(async () => { rerenderWith(1) })
        await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("|none|"))
    })

    it("follows a renamed or relinked file", async () => {
        vi.mocked(getDBGroupAudioFiles).mockResolvedValue([audioFile])
        const { rerenderWith } = renderProvider(0)
        await userEvent.click(screen.getByText("info"))
        vi.mocked(getDBGroupAudioFiles).mockResolvedValue([{ ...audioFile, name: "b.mp3", path: "/n/b.mp3" }])
        await act(async () => { rerenderWith(1) })
        await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("|b.mp3|/n/b.mp3"))
    })
})
