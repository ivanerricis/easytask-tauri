#!/usr/bin/env node
// Fails (exit 1) when package.json, package-lock.json, src-tauri/Cargo.toml, src-tauri/Cargo.lock and
// src-tauri/tauri.conf.json disagree on the version, or when CHANGELOG.md / CHANGELOG.it.md have no section for it
// (the release notes of the app are built from both).
// When a tag is given (first argument or GITHUB_REF_NAME like v1.2.3) it must match too.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    CHANGELOG_FILES,
    findMismatches,
    getCargoLockVersion,
    getCargoTomlVersion,
    getJsonVersion,
    getPackageLockVersion,
    hasChangelogSection,
    VERSION_FILES,
} from './versions.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => readFileSync(path.join(root, file), 'utf8')

const versions = {
    packageJson: getJsonVersion(read(VERSION_FILES.packageJson)),
    packageLock: getPackageLockVersion(read(VERSION_FILES.packageLock)),
    cargoToml: getCargoTomlVersion(read(VERSION_FILES.cargoToml)),
    cargoLock: getCargoLockVersion(read(VERSION_FILES.cargoLock)),
    tauriConf: getJsonVersion(read(VERSION_FILES.tauriConf)),
}

const problems = findMismatches(versions)
for (const file of CHANGELOG_FILES) {
    if (!hasChangelogSection(read(file), versions.packageJson)) problems.push(`${file} has no "## [${versions.packageJson}]" section`)
}
const tag = process.argv[2] ?? (/^v\d/.test(process.env.GITHUB_REF_NAME ?? '') ? process.env.GITHUB_REF_NAME : undefined)
if (tag && tag.replace(/^v/, '') !== versions.packageJson) {
    problems.push(`tag ${tag} does not match the version ${versions.packageJson}`)
}

if (problems.length > 0) {
    console.error('Version mismatch:')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
}
console.log(`Versions in sync: ${versions.packageJson}`)
