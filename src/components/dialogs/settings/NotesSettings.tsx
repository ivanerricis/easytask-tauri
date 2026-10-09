import { useTranslation } from "react-i18next"
import { usePreferences } from "@/contexts/use-preferences"
import { SettingsPanel, SettingsSubsection, SettingsSwitchRow } from "./SettingsRow"

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
        showUnnamedLabels, setShowUnnamedLabels,
        taskBackground, setTaskBackground,
        renameOnClick, setRenameOnClick,
        hideCompletedTasks, setHideCompletedTasks,
        reopenNotes, setReopenNotes,
        reopenLastWorkspace, setReopenLastWorkspace,
    } = usePreferences()

    return (
        <SettingsPanel title={t("settings.notes.title")}>
            <SettingsSubsection title={t("settings.notes.sections.progress")}>
                <SettingsSwitchRow label={t("settings.notes.progressBar.label")} description={t("settings.notes.progressBar.description")} checked={showProgressBar} onCheckedChange={setShowProgressBar} />
                <SettingsSwitchRow label={t("settings.notes.groupProgressBar.label")} description={t("settings.notes.groupProgressBar.description")} checked={showGroupProgressBar} onCheckedChange={setShowGroupProgressBar} />
            </SettingsSubsection>
            <SettingsSubsection title={t("settings.notes.sections.counts")}>
                <SettingsSwitchRow label={t("settings.notes.sectionCount")} checked={showSectionCount} onCheckedChange={setShowSectionCount} />
                <SettingsSwitchRow label={t("settings.notes.taskCount")} checked={showTaskCount} onCheckedChange={setShowTaskCount} />
                <SettingsSwitchRow label={t("settings.notes.audioFileCount")} checked={showAudioFileCount} onCheckedChange={setShowAudioFileCount} />
                <SettingsSwitchRow label={t("settings.notes.subtaskCount.label")} description={t("settings.notes.subtaskCount.description")} checked={showSubtaskCount} onCheckedChange={setShowSubtaskCount} />
            </SettingsSubsection>
            <SettingsSubsection title={t("settings.notes.sections.display")}>
                <SettingsSwitchRow label={t("settings.notes.groupSeparators.label")} description={t("settings.notes.groupSeparators.description")} checked={showGroupSeparators} onCheckedChange={setShowGroupSeparators} />
                <SettingsSwitchRow label={t("settings.notes.unnamedLabels.label")} description={t("settings.notes.unnamedLabels.description")} checked={showUnnamedLabels} onCheckedChange={setShowUnnamedLabels} />
                <SettingsSwitchRow label={t("settings.notes.taskBackground.label")} description={t("settings.notes.taskBackground.description")} checked={taskBackground} onCheckedChange={setTaskBackground} />
                <SettingsSwitchRow label={t("settings.notes.hideCompleted.label")} description={t("settings.notes.hideCompleted.description")} checked={hideCompletedTasks} onCheckedChange={setHideCompletedTasks} />
            </SettingsSubsection>
            <SettingsSubsection title={t("settings.notes.sections.behavior")}>
                <SettingsSwitchRow label={t("settings.notes.renameOnClick.label")} description={t("settings.notes.renameOnClick.description")} checked={renameOnClick} onCheckedChange={setRenameOnClick} />
            </SettingsSubsection>
            <SettingsSubsection title={t("settings.notes.sections.startup")}>
                <SettingsSwitchRow label={t("settings.notes.reopenWorkspace.label")} description={t("settings.notes.reopenWorkspace.description")} checked={reopenLastWorkspace} onCheckedChange={setReopenLastWorkspace} />
                <SettingsSwitchRow label={t("settings.notes.reopenNotes.label")} description={t("settings.notes.reopenNotes.description")} checked={reopenNotes} onCheckedChange={setReopenNotes} />
            </SettingsSubsection>
        </SettingsPanel>
    )
}
