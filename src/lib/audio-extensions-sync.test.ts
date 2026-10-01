import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { AUDIO_EXTENSIONS } from "@/db/queries/audio"

describe("AUDIO_EXTENSIONS", () => {
    it("is identical in the Rust backend (src-tauri/src/lib.rs) and the frontend", () => {
        const rust = readFileSync(resolve(__dirname, "../../src-tauri/src/lib.rs"), "utf8")
        const match = rust.match(/const AUDIO_EXTENSIONS:\s*\[&str;\s*\d+\]\s*=\s*\[([^\]]*)\]/)
        expect(match, "AUDIO_EXTENSIONS not found in lib.rs").not.toBeNull()
        const rustExtensions = [...match![1].matchAll(/"([^"]+)"/g)].map(m => m[1]).sort()
        expect(rustExtensions).toEqual([...AUDIO_EXTENSIONS].sort())
    })
})
