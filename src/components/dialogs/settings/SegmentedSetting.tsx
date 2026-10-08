import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SettingsRow } from "./SettingsRow"

type SegmentedSettingProps<T extends string> = {
    label: string
    description?: string
    value: T
    options: readonly { value: T, label: string }[]
    onChange: (value: T) => void
}

/** A setting with a few mutually exclusive values, as a row with a segmented control (a ToggleGroup: arrows move between the values). */
export function SegmentedSetting<T extends string>({ label, description, value, options, onChange }: SegmentedSettingProps<T>) {
    return (
        <SettingsRow label={label} description={description}>
            {({ id, labelId, descriptionId }) => (
                <ToggleGroup
                    id={id}
                    type="single"
                    variant="outline"
                    size="sm"
                    value={value}
                    // Pressing the selected value again would leave the group empty: a setting always has a value
                    onValueChange={next => { if (next) onChange(next as T) }}
                    aria-labelledby={labelId}
                    aria-describedby={descriptionId}
                >
                    {options.map(option => (
                        <ToggleGroupItem key={option.value} value={option.value} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground">
                            {option.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            )}
        </SettingsRow>
    )
}
