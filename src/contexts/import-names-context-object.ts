import { createContext } from "react"
import type { ChooseImportNames } from "@/lib/workspace-transfer"

export const ImportNamesContext = createContext<ChooseImportNames | undefined>(undefined)
