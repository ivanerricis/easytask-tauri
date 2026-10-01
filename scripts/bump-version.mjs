#!/usr/bin/env node
// Usage: npm run release:bump -- x.y.z
// Updates the app version in package.json, package-lock.json, src-tauri/Cargo.toml, src-tauri/Cargo.lock
// and src-tauri/tauri.conf.json. It does not commit, tag or push.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    isSemver,
    setCargoLockVersion,
    setCargoTomlVersion,
    setJsonVersion,
    setPackageLockVersion,
} from './versions.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const targets = [
    ['package.json', setJsonVersion],
    ['package-lock.json', setPackageLockVersion],
    ['src-tauri/Cargo.toml', setCargoTomlVersion],
    ['src-tauri/Cargo.lock', setCargoLockVersion],
    ['src-tauri/tauri.conf.json', setJsonVersion],
]

const version = process.argv[2]?.replace(/^v/, '')
if (!isSemver(version)) {
    console.error(`Invalid version "${process.argv[2] ?? ''}". Usage: npm run release:bump -- x.y.z`)
    process.exit(1)
}

// Compute everything first so a failure leaves all files untouched
const updated = targets.map(([file, update]) => {
    const full = path.join(root, file)
    try {
        return [full, file, update(readFileSync(full, 'utf8'), version)]
    } catch (error) {
        console.error(`${file}: ${error instanceof Error ? error.message : error}`)
        process.exit(1)
    }
})
for (const [full, file, content] of updated) {
    writeFileSync(full, content)
    console.log(`updated ${file}`)
}
console.log(`\nVersion set to ${version}. Review the diff, commit and tag v${version}.`)
