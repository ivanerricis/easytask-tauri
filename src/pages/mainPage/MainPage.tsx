import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { DialogCreateWorkspace } from "./components/DialogCreateWorkspace"
import { Loader2, LayoutGrid, LayoutList, Upload, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/use-workspace"
import { ErrorPage } from "@/components/pages/error-page"
import { LoadingPage } from "@/components/pages/loading-page"
import { MainPageLayout } from "./MainPageLayout"
import { WorkspacesContainer } from "./components/WorkspacesContainer"
import { ButtonTrashWorkspaces } from "./components/ButtonTrashWorkspaces"
import { TooltipCustom } from "@/components/tooltip-custom"
import { usePreferences } from "@/contexts/use-preferences"
import { useWorkspaceTransfer } from "@/hooks/use-workspace-transfer"
import { reportError } from "@/lib/report-error"
import { useStartupRestore } from "./startup-restore"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { WorkspaceSortBy, WorkspaceSortDir } from "@/lib/store/preferences"

const MainPage = () => {
    const { t } = useTranslation()
    const { workspaces, getWorkspaces, error } = useWorkspace()
    const [loaded, setLoaded] = useState(false)
    const { workspaceView, setWorkspaceView, workspaceSort, setWorkspaceSort } = usePreferences()
    const { importWorkspace, isBusy: isImporting } = useWorkspaceTransfer()
    const isList = workspaceView === "list"
    const isNameSort = workspaceSort.by === "name"
    const { pending: restorePending } = useStartupRestore(loaded)

    useEffect(() => {
        getWorkspaces().catch(error => reportError(error)).finally(() => setLoaded(true))
    }, [getWorkspaces])

    // Only the first load replaces the page: later operations (e.g. restoring a workspace from the trash) must not
    // unmount it, or the open trash dialog would be closed
    const isInitialLoading = !loaded || restorePending

    if (isInitialLoading) {
        return (
            <MainPageLayout>
                <LoadingPage text={t("home.loading")}/>
            </MainPageLayout>
        )
    }

    if (error && workspaces.length === 0) {
        return (
            <MainPageLayout>
                <ErrorPage error={error} onRetry={() => { getWorkspaces().catch(err => reportError(err)) }} />
            </MainPageLayout>
        )
    }

    return (
        <MainPageLayout>
            <div className="flex flex-col w-full max-w-[600px] px-4 h-full items-center justify-center gap-8">
                <h1 className="text-4xl">{t("home.welcome")}</h1>
                <div className="flex w-full flex-wrap items-center justify-center gap-3">
                    <DialogCreateWorkspace />
                    <Button
                        variant="outline"
                        onClick={() => void importWorkspace()}
                        disabled={isImporting}
                        className="flex items-center justify-center w-[280px] max-w-full p-6 rounded-full gap-2 text-lg border-primary transition-all"
                    >
                        {t("home.import")}
                        {isImporting ? <Loader2 className="h-5! w-5! animate-spin" /> : <Upload className="h-5! w-5!" />}
                    </Button>
                </div>
                <div className="flex flex-col items-center justify-center w-full p-2 gap-2 border rounded-xs">
                    <div className="flex items-center justify-between w-full">
                        <h2 className="text-lg w-full ml-2">
                            {t("home.recent")}
                        </h2>
                        <div className="flex items-center gap-1">
                            <TooltipCustom text={isList ? t("home.viewGrid") : t("home.viewList")}>
                                <Button
                                    onClick={() => setWorkspaceView(isList ? "grid" : "list")}
                                    variant="outline"
                                    size="icon"
                                    aria-label={isList ? t("home.viewGrid") : t("home.viewList")}>
                                    {isList ? <LayoutGrid /> : <LayoutList />}
                                </Button>
                            </TooltipCustom>
                            <DropdownMenu>
                                <TooltipCustom text={t("home.sort.label")}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" aria-label={t("home.sort.label")}>
                                            <ArrowUpDown />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipCustom>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>{t("home.sort.by")}</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup
                                        value={workspaceSort.by}
                                        onValueChange={(by) => setWorkspaceSort({ ...workspaceSort, by: by as WorkspaceSortBy })}>
                                        <DropdownMenuRadioItem value="edited">{t("home.sort.edited")}</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="created">{t("home.sort.created")}</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="name">{t("home.sort.name")}</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>{t("home.sort.direction")}</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup
                                        value={workspaceSort.dir}
                                        onValueChange={(dir) => setWorkspaceSort({ ...workspaceSort, dir: dir as WorkspaceSortDir })}>
                                        <DropdownMenuRadioItem value="asc">
                                            {t(isNameSort ? "home.sort.nameAsc" : "home.sort.dateAsc")}
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="desc">
                                            {t(isNameSort ? "home.sort.nameDesc" : "home.sort.dateDesc")}
                                        </DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <ButtonTrashWorkspaces />
                        </div>
                    </div>
                    <WorkspacesContainer workspaces={workspaces} view={workspaceView} sort={workspaceSort} />
                </div>
            </div>
        </MainPageLayout>
    )
}

export default MainPage;