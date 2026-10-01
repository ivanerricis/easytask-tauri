# Releasing EasyTask

Maintainer guide. Releases are built by `.github/workflows/release.yml` and always end as a **draft** GitHub Release:
nothing reaches users until you click "Publish".

## 1. One-time prerequisites

The in-app updater only installs updates signed with your key.

1. Generate the key pair: `npm run tauri signer generate -- -w ~/.tauri/easytask.key` (it asks for a password).
2. Put the **public** key in `src-tauri/tauri.conf.json`, replacing the placeholder `REPLACE_WITH_MINISIGN_PUBLIC_KEY` in `plugins.updater.pubkey`. Commit it.
3. Add two GitHub repository secrets (Settings > Secrets and variables > Actions):
   - `TAURI_SIGNING_PRIVATE_KEY`: the content of the private key file
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: its password

Keep the private key and its password in a password manager plus an offline backup. Never commit them.

**If the private key is lost**, installed apps can no longer verify new updates and will never update again.
Users must download and install a new build manually; that build must contain a new public key (generate a new pair, update `pubkey`, update the secrets).

Until the placeholder is replaced the app runs normally, but "Check for updates" reports an error, and signed updater artifacts cannot be produced.

## 2. Release steps

1. Make sure `master` is green on CI and contains everything you want to ship.
2. Bump the version everywhere: `npm run release:bump X.Y.Z`
   (updates `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`; it does not commit, tag or push).
   `npm run release:check` verifies that the version files agree (CI runs it too).
3. Commit: `git commit -am "chore(release): vX.Y.Z"`
4. Tag and push: `git tag vX.Y.Z`, then `git push origin master vX.Y.Z` (pushing the tag starts the pipeline).
5. The pipeline runs, in order:
   1. **verify** (Linux): checks that the versions and the tag agree, then ESLint, `tsc`, unit tests, build, `cargo clippy`, `cargo test`. A failure here stops everything.
   2. **release** (Windows and Linux in parallel): builds the installers (NSIS on Windows; deb and AppImage on Linux), signs the updater artifacts (`.sig` files), and uploads everything, plus a merged `latest.json`, to a **draft** release named `EasyTask vX.Y.Z`. The Windows job also keeps the built executable for the next step.
   3. **portable** (Windows): creates `EasyTask_X.Y.Z_x64_portable.zip` (`EasyTask.exe`, `portable.txt`, `LEGGIMI.txt`) and uploads it to the same draft.
6. Open the draft in GitHub (Releases) and check the assets (see the list in section 5): installers, `.sig` files, `latest.json`, the portable zip.
   Optionally download and try the installer and the portable zip.
7. Write the release notes in the draft (users see them in the "What's new" part of the update dialog).
8. Click **Publish release**. Only then do users see it and does the updater consider it: the endpoint is `releases/latest/download/latest.json`, which resolves to the latest *published* release.

## 3. Not publishing by mistake, and undoing

- Ordinary commits and pushes release nothing. Only a pushed tag matching `v*`, or a manual run of the Release workflow, starts it.
- Even then the result is a draft, invisible to users until published.
- **Delete a draft:** GitHub > Releases > open the draft > Delete.
- **Delete a wrong tag:** `git tag -d vX.Y.Z` and `git push origin :refs/tags/vX.Y.Z`. Delete the draft too, then fix, bump again if needed, and re-tag.
- If a release was already published with a problem, unpublish it (set it back to draft or delete it) so the updater stops offering it, then ship a new version; do not reuse a version number that users may already have installed.

## 4. What users see

- **Installed app (Windows):** a toast a few seconds after startup ("Update available") with an "Open About" action, and Settings > About, which also has a manual check. "Download and install" downloads, installs (passive mode) and restarts the app. The startup check can be turned off.
- **Portable app (Windows):** the same notice, but instead of installing it shows a hint and a link to the Releases page; the user replaces `EasyTask.exe` with the one from the new zip (the `data` folder is kept).
- **Linux:** the app uses the same updater endpoint, so Linux installs of the AppImage can use it; with the `.deb` and for any case where the in-app install is not wanted, download the new file from the Releases page. (Not tested on every distribution.)

## 5. Artifact names

- Installers use the `productName` and the version from `tauri.conf.json` (NSIS: `EasyTask_X.Y.Z_x64-setup.exe`; Linux: `.deb` and `.AppImage`), with matching `.sig` signature files, plus `latest.json`. Exact file names are chosen by Tauri's bundler: check them in the draft.
- The Cargo binary is named `EasyTask` (`[[bin]]` in `src-tauri/Cargo.toml`, same as `productName`), so it is `EasyTask.exe` (Windows) in `src-tauri/target/release`, in the installers and in the portable zip. The crate/package itself is still called `app`.
- Portable zip: `EasyTask_<package.json version>_x64_portable.zip`, containing `EasyTask.exe`, `portable.txt` and `LEGGIMI.txt` directly (no wrapping folder).
- `portable.txt` and `LEGGIMI.txt` come from `.github/portable/`.

## 6. Known limits and ideas

- **Windows code signing:** binaries are not signed, so SmartScreen warns users. Free options to look at for open source projects: SignPath Foundation. This is separate from the updater key above, which only protects updates.
- **Package managers:** winget and Scoop manifests could point at the published release assets.
- **macOS:** not built or tested. Adding it needs a macOS runner in the release matrix, the `dmg`/`app` bundle targets and Apple signing/notarization.
- **Manual runs (`workflow_dispatch`):** the workflow uses `github.ref_name` as the release tag. Started from a branch, it would create a draft for a tag named after the branch (for example `master`) and skip the tag/version check. Do not use it that way: when running it manually, pick the existing tag `vX.Y.Z` in the "Use workflow from" selector, so the run behaves like a tag push.
- The e2e job in CI is not part of the release pipeline.

## 7. Checklist

```
[ ] One time: updater key generated, pubkey in tauri.conf.json, both secrets set
[ ] master is green on CI
[ ] npm run release:bump X.Y.Z
[ ] npm run release:check passes
[ ] git commit -am "chore(release): vX.Y.Z"
[ ] git tag vX.Y.Z
[ ] git push origin master vX.Y.Z
[ ] Release workflow green (verify, release x2, portable)
[ ] Draft contains: NSIS installer, deb, AppImage, .sig files, latest.json, portable zip
[ ] Installer and portable zip tried (optional but recommended)
[ ] Release notes written
[ ] Publish release
[ ] Check "Check for updates" from the previous version
```
