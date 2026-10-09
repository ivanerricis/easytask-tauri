import { useTranslation } from "react-i18next"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SettingsCategory } from "./categories"

type SettingsNavProps = {
    categories: SettingsCategory[]
}

/** The categories of the settings: the vertical tab list of the dialog (arrows move between them). Must be inside a `Tabs`. */
export const SettingsNav = ({ categories }: SettingsNavProps) => {
    const { t } = useTranslation()
    return (
        <TabsList
            variant="line"
            aria-label={t("settings.nav")}
            className="w-full shrink-0 max-sm:flex-row max-sm:flex-wrap sm:h-fit sm:justify-start sm:self-start gap-1 p-0"
        >
            {categories.map(({ id, labelKey, icon: Icon }) => (
                <TabsTrigger
                    key={id}
                    value={id}
                    className="flex-none sm:flex-1 justify-start px-3 py-2 data-[state=active]:font-medium data-[state=active]:bg-accent"
                >
                    <Icon />
                    {t(labelKey)}
                </TabsTrigger>
            ))}
        </TabsList>
    )
}
