import { useTranslation } from "react-i18next"
import { Switch } from "@/components/ui/switch"
import { usePreferences } from "@/contexts/use-preferences"
import { SettingsPanel, SettingsRow, SettingsSubsection } from "./SettingsRow"

export const NotesSettings = () => {
    const { t } = useTranslation()
    const {
        showProgressBar, setShowProgressBar,
        showGroupProgressBar, setShowGroupProgressBar,
        showSectionCount, setShowSectionCount,
        showTaskCount, setShowTaskCount,
        showAudioFileCount, setShowAudioFileCount,
        showGroupSeparators, setShowGroupSeparators,
        showSubtaskCount, setShowSubtaskCount,
        hideCompletedTasks, setHideCompletedTasks,
        reopenNotes, setReopenNotes,
        reopenLastWorkspace, setReopenLastWorkspace,
    } = usePreferences()

    return (
        <SettingsPanel title={t("settings.notes.title")}>
            <SettingsSubsection title={t("settings.notes.sections.progress")}>
                <SettingsRow label={t("settings.notes.progressBar.label")} description={t("settings.notes.progressBar.description")}>
                    <Switch
                        aria-label={t("settings.notes.progressBar.label")}
                        checked={showProgressBar}
                        onCheckedChange={() => setShowProgressBar(!showProgressBar)}
                    />
                </SettingsRow>
                <SettingsRow label={t("settings.notes.groupProgressBar.label")} description={t("settings.notes.groupProgressBar.description")}>
                    <Switch
                        aria-label={t("settings.notes.groupProgressBar.label")}
                        checked={showGroupProgressBar}
                        onCheckedChange={() => setShowGroupProgressBar(!showGroupProgressBar)}
                    />
                </SettingsRow>
            </SettingsSubsection>
            <SettingsSubsection title={t("settings.notes.sections.counts")}>
                <SettingsRow label={t("settings.notes.sectionCount")}>
                    <Switch
                        aria-label={t("settings.notes.sectionCount")}
                        checked={showSectionCount}
                        onCheckedChange={() => setShowSectionCount(!showSectionCount)}
                    />
                </SettingsRow>
                <SettingsRow label={t("settings.notes.taskCount")}>
                    <Switch
                        aria-label={t("settings.notes.taskCount")}
                        checked={showTaskCount}
                        onCheckedChange={() => setShowTaskCount(!showTaskCount)}
                    />
                </SettingsRow>
                <SettingsRow label={t("settings.notes.audioFileCount")}>
                    <Switch
                        aria-label={t("settings.notes.audioFileCount")}
                        checked={showAudioFileCount}
                        onCheckedChange={() => setShowAudioFileCount(!showAudioFileCount)}
                    />
                </SettingsRow>
                <SettingsRow label={t("settings.notes.subtaskCount.label")} description={t("settings.notes.subtaskCount.description")}>
                    <Switch
                        aria-label={t("settings.notes.subtaskCount.label")}
                        checked={showSubtaskCount}
                        onCheckedChange={() => setShowSubtaskCount(!showSubtaskCount)}
                    />
                </SettingsRow>
            </SettingsSubsection>
            <SettingsSubsection title={t("settings.notes.sections.display")}>
                <SettingsRow label={t("settings.notes.groupSeparators.label")} description={t("settings.notes.groupSeparators.description")}>
                    <Switch
                        aria-label={t("settings.notes.groupSeparators.label")}
                        checked={showGroupSeparators}
                        onCheckedChange={() => setShowGroupSeparators(!showGroupSeparators)}
                    />
                </SettingsRow>
                <SettingsRow label={t("settings.notes.hideCompleted.label")} description={t("settings.notes.hideCompleted.description")}>
                    <Switch
                        aria-label={t("settings.notes.hideCompleted.label")}
                        checked={hideCompletedTasks}
                        onCheckedChange={() => setHideCompletedTasks(!hideCompletedTasks)}
                    />
                </SettingsRow>
            </SettingsSubsection>
            <SettingsSubsection title={t("settings.notes.sections.startup")}>
                <SettingsRow label={t("settings.notes.reopenWorkspace.label")} description={t("settings.notes.reopenWorkspace.description")}>
                    <Switch
                        aria-label={t("settings.notes.reopenWorkspace.label")}
                        checked={reopenLastWorkspace}
                        onCheckedChange={() => setReopenLastWorkspace(!reopenLastWorkspace)}
                    />
                </SettingsRow>
                <SettingsRow label={t("settings.notes.reopenNotes.label")} description={t("settings.notes.reopenNotes.description")}>
                    <Switch
                        aria-label={t("settings.notes.reopenNotes.label")}
                        checked={reopenNotes}
                        onCheckedChange={() => setReopenNotes(!reopenNotes)}
                    />
                </SettingsRow>
            </SettingsSubsection>
        </SettingsPanel>
    )
}
