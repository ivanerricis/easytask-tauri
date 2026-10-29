import { createRequiredContextHook } from "@/lib/required-context"
import { WorkspaceContext } from "./workspace-context-object"

export const useWorkspace = createRequiredContextHook(WorkspaceContext, "useWorkspace", "WorkspaceProvider")
