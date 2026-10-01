# Releasing EasyTask

(Short note on the updater keys; the full release procedure is documented elsewhere.)

## Updater signing key (one time)

The in-app updater only accepts updates signed with your key.

1. Generate the key pair: `npm run tauri signer generate -- -w ~/.tauri/easytask.key`
2. Put the **public** key in `src-tauri/tauri.conf.json`, replacing the placeholder `REPLACE_WITH_MINISIGN_PUBLIC_KEY` in `plugins.updater.pubkey`.
3. Add the GitHub repository secrets `TAURI_SIGNING_PRIVATE_KEY` (content of the private key file) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

Until the placeholder is replaced the app runs normally; "Check for updates" just reports an error.
Never commit the private key. Losing it means existing installs can no longer be updated.

## Version bump

`npm run release:bump -- x.y.z` updates every version file; `npm run release:check` (also run in CI) fails if they disagree.
