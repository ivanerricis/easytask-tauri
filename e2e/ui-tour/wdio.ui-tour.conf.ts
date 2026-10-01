import path from "node:path"
import { fileURLToPath } from "node:url"
import { config as base } from "../wdio.conf"

/**
 * WebdriverIO configuration of the visual UI tour (`npm run ui-tour`): it reuses everything of the e2e
 * configuration (temporary EASYTASK_DATA_DIR, tauri-driver, msedgedriver, optional build) but runs only the tour spec.
 */
const here = path.dirname(fileURLToPath(import.meta.url))

export const config: typeof base = {
    ...base,
    specs: [path.join(here, "ui-tour.e2e.ts")],
    mochaOpts: { ...base.mochaOpts, timeout: 3_600_000 },
}
