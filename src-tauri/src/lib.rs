use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_fs::FsExt;

/// Marker file: when it sits next to the executable the app runs in portable mode.
const PORTABLE_MARKER: &str = "portable.txt";
/// Environment variable that overrides the data folder (used by the e2e tests).
const DATA_DIR_ENV: &str = "EASYTASK_DATA_DIR";
/// Name of the data folder inside the user's Documents folder (installed mode).
const APP_FOLDER: &str = "EasyTask";
/// Log files rotate at this size and this many are kept.
const LOG_MAX_FILE_SIZE: u128 = 1_000_000;
const LOG_FILES_KEPT: usize = 5;
/// Subfolders of the data folder the UI is allowed to open in the file manager.
const OPENABLE_SUBFOLDERS: [&str; 2] = ["backups", "logs"];

/// Where the app keeps its data and whether it runs in portable mode.
#[derive(Debug, Clone, PartialEq, Eq)]
struct DataDirInfo {
    path: PathBuf,
    portable: bool,
}

/// Decides the data folder. Priority: the `EASYTASK_DATA_DIR` override (portable only if `portable.txt`
/// exists), then `<exe folder>/data` when `portable.txt` sits next to the executable, then `<Documents>/EasyTask`.
fn resolve_data_dir(
    env_dir: Option<&str>,
    exe_dir: &Path,
    documents: &Path,
) -> Result<DataDirInfo, String> {
    let portable = is_portable_install(exe_dir);
    let path = match env_dir.map(str::trim).filter(|dir| !dir.is_empty()) {
        Some(dir) => {
            let dir = PathBuf::from(dir);
            // A relative path would depend on the working directory the app was launched from
            if !dir.is_absolute() {
                return Err(format!(
                    "{DATA_DIR_ENV} must be an absolute path, got \"{}\"",
                    dir.display()
                ));
            }
            dir
        }
        None if portable => exe_dir.join("data"),
        None => documents.join(APP_FOLDER),
    };
    Ok(DataDirInfo { path, portable })
}

/// True when `portable.txt` sits next to the executable.
fn is_portable_install(exe_dir: &Path) -> bool {
    exe_dir.join(PORTABLE_MARKER).is_file()
}

/// True when the path has a component that starts with "OneDrive" (case-insensitive), e.g.
/// `C:\Users\me\OneDrive\Documents` or `C:\Users\me\OneDrive - Contoso\Documents`.
fn path_in_onedrive(path: &Path) -> bool {
    path.components().any(|component| {
        component
            .as_os_str()
            .to_str()
            .map(|name| name.to_ascii_lowercase().starts_with("onedrive"))
            .unwrap_or(false)
    })
}

/// Resolves the data folder for the running app and creates it when missing.
fn locate_data_dir(app: &tauri::AppHandle) -> Result<DataDirInfo, String> {
    let exe = std::env::current_exe()
        .map_err(|error| format!("cannot locate the executable: {error}"))?;
    let exe_dir = exe
        .parent()
        .ok_or_else(|| "the executable has no parent folder".to_string())?;
    // Minimal Linux setups (containers, CI runners) have no Documents folder: fall back to the app data folder
    // instead of failing the whole startup
    let documents = app
        .path()
        .document_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|error| format!("cannot locate the Documents or the app data folder: {error}"))?;
    let env_dir = std::env::var(DATA_DIR_ENV).ok();
    let info = resolve_data_dir(env_dir.as_deref(), exe_dir, &documents)?;
    std::fs::create_dir_all(&info.path).map_err(|error| {
        format!(
            "cannot create the data folder {}: {error}",
            info.path.display()
        )
    })?;
    Ok(info)
}

/// Absolute path of the data folder (database, settings, backups, logs). Created at startup.
#[tauri::command]
fn data_dir(info: tauri::State<'_, DataDirInfo>) -> String {
    info.path.to_string_lossy().into_owned()
}

/// True when the data folder is synced by OneDrive (Windows only): SQLite files in a synced folder can hit
/// "database is locked" errors or conflicted copies.
#[tauri::command]
fn data_dir_in_onedrive(info: tauri::State<'_, DataDirInfo>) -> bool {
    cfg!(windows) && path_in_onedrive(&info.path)
}

/// True when the app runs in portable mode (`portable.txt` next to the executable).
#[tauri::command]
fn is_portable(info: tauri::State<'_, DataDirInfo>) -> bool {
    info.portable
}

/// Opens the data folder (or one of its allowed subfolders) in the file manager.
#[tauri::command]
fn open_data_folder(
    app: tauri::AppHandle,
    info: tauri::State<'_, DataDirInfo>,
    subfolder: Option<String>,
) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    let mut target = info.path.clone();
    if let Some(name) = subfolder {
        if !OPENABLE_SUBFOLDERS.contains(&name.as_str()) {
            return Err("folder not allowed".to_string());
        }
        target.push(name);
        std::fs::create_dir_all(&target).map_err(|error| error.to_string())?;
    }
    app.opener()
        .open_path(target.to_string_lossy(), None::<&str>)
        .map_err(|error| error.to_string())
}

/// Extensions (lowercase) of the audio files the app is allowed to check and play.
/// Keep in sync with AUDIO_EXTENSIONS in src/db/queries/audio.ts.
const AUDIO_EXTENSIONS: [&str; 8] = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "webm"];

/// True when the path is an existing regular file with an allowed audio extension.
fn is_audio_file(path: &str) -> bool {
    let path = Path::new(path);
    let has_audio_extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| AUDIO_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str()))
        .unwrap_or(false);
    has_audio_extension && path.is_file()
}

/// Tells whether an audio file is still where the database says it is.
/// Only files with an audio extension are considered, so the command cannot be used to probe other paths.
#[tauri::command]
fn audio_file_exists(path: String) -> bool {
    is_audio_file(&path)
}

/// Grants the asset protocol access to ONE audio file (no global scope is configured), so the webview
/// can stream it through convertFileSrc. Fails if the file is missing or is not an audio file.
#[tauri::command]
fn allow_audio_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    if !is_audio_file(&path) {
        return Err("audio file not found".to_string());
    }
    app.asset_protocol_scope()
        .allow_file(Path::new(&path))
        .map_err(|error| error.to_string())
}

/// One statement of a `db_transaction` call.
#[derive(serde::Deserialize)]
struct Stmt {
    sql: String,
    #[serde(default)]
    params: Vec<serde_json::Value>,
}

/// Outcome of one statement of a `db_transaction` call (camelCase, like the JS side expects).
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct StmtResult {
    rows_affected: u64,
    last_insert_id: i64,
}

/// Resolves a `{ "$ref": n, "offset": k }` parameter to `results[n].lastInsertId - k`.
/// Returns None when the value is not a reference object.
fn resolve_ref(value: &serde_json::Value, results: &[StmtResult]) -> Option<Result<i64, String>> {
    let object = value.as_object()?;
    let reference = object.get("$ref")?;
    let index = match reference.as_u64() {
        Some(index) => index as usize,
        None => return Some(Err("$ref must be a non-negative integer".to_string())),
    };
    let offset = object.get("offset").and_then(|v| v.as_i64()).unwrap_or(0);
    Some(match results.get(index) {
        Some(result) => Ok(result.last_insert_id - offset),
        None => Err(format!(
            "$ref {index} does not point to an earlier statement"
        )),
    })
}

/// Runs the statements atomically on `pool`: all share one connection inside a transaction, which is
/// committed if every statement succeeds and rolled back (by dropping it) on the first error.
async fn run_transaction(
    pool: &sqlx::SqlitePool,
    statements: &[Stmt],
) -> Result<Vec<StmtResult>, String> {
    use sqlx::Executor;

    let mut tx = pool
        .begin()
        .await
        .map_err(|error| format!("cannot start the transaction: {error}"))?;
    let mut results: Vec<StmtResult> = Vec::with_capacity(statements.len());

    for (index, statement) in statements.iter().enumerate() {
        let mut query = sqlx::query(&statement.sql);
        for value in &statement.params {
            if let Some(resolved) = resolve_ref(value, &results) {
                let id = resolved.map_err(|error| format!("statement {index}: {error}"))?;
                query = query.bind(id);
                continue;
            }
            query = match value {
                serde_json::Value::Null => query.bind(None::<i64>),
                serde_json::Value::Bool(flag) => query.bind(*flag),
                serde_json::Value::String(text) => query.bind(text.clone()),
                serde_json::Value::Number(number) => match number.as_i64() {
                    Some(integer) => query.bind(integer),
                    None => query.bind(number.as_f64().unwrap_or_default()),
                },
                other => query.bind(other.to_string()),
            };
        }
        // On error `tx` is dropped, which rolls the transaction back.
        let outcome = tx
            .execute(query)
            .await
            .map_err(|error| format!("statement {index} failed: {error}"))?;
        results.push(StmtResult {
            rows_affected: outcome.rows_affected(),
            last_insert_id: outcome.last_insert_rowid(),
        });
    }

    tx.commit()
        .await
        .map_err(|error| format!("commit failed: {error}"))?;
    Ok(results)
}

/// Runs several statements atomically on the pool loaded by tauri-plugin-sql (same `db` key passed to
/// `Database.load`). See `run_transaction`.
#[tauri::command]
async fn db_transaction(
    db_instances: tauri::State<'_, tauri_plugin_sql::DbInstances>,
    db: String,
    statements: Vec<Stmt>,
) -> Result<Vec<StmtResult>, String> {
    let instances = db_instances.0.read().await;
    let pool = match instances.get(&db) {
        Some(tauri_plugin_sql::DbPool::Sqlite(pool)) => pool,
        None => return Err(format!("database {db} is not loaded")),
    };
    run_transaction(pool, &statements).await
}

/// Portable mode as seen before the app exists (plugins are registered first).
fn portable_install() -> bool {
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(is_portable_install))
        .unwrap_or(false)
}

/// Whether the single-instance lock applies. Only release builds on the default data folder take it:
/// a debug build (`tauri dev`, e2e) or an `EASYTASK_DATA_DIR` override uses its own data, so it must be able to
/// run next to the installed app instead of exiting immediately.
fn single_instance_enabled(debug_build: bool, data_dir_override: bool) -> bool {
    !debug_build && !data_dir_override
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();
    // Must be the first plugin. A second launch focuses the window of the running instance.
    #[cfg(desktop)]
    if single_instance_enabled(
        cfg!(debug_assertions),
        std::env::var_os(DATA_DIR_ENV).is_some(),
    ) {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }
    // The plugin stores .window-state.json in the user profile, outside the portable folder, so it is
    // skipped in portable mode.
    if !portable_install() {
        builder = builder.plugin(tauri_plugin_window_state::Builder::default().build());
    }
    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let info = match locate_data_dir(app.handle()) {
                Ok(info) => info,
                Err(error) => {
                    // Show the reason instead of exiting silently. The non-blocking dialog is queued on the
                    // main thread (a blocking one would deadlock here, the event loop is not running yet).
                    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
                    let handle = app.handle().clone();
                    app.dialog()
                        .message(format!("EasyTask cannot start.\n\n{error}"))
                        .title("EasyTask")
                        .kind(MessageDialogKind::Error)
                        .show(move |_| handle.exit(1));
                    return Ok(());
                }
            };

            // Runtime scope limited to the data folder (no global scope in the capabilities).
            app.fs_scope().allow_directory(&info.path, true)?;
            app.asset_protocol_scope()
                .allow_directory(&info.path, true)?;

            // File logging (rotated by size) in <data>/logs, also in release builds.
            let mut log = tauri_plugin_log::Builder::default()
                .clear_targets()
                .level(log::LevelFilter::Info)
                .max_file_size(LOG_MAX_FILE_SIZE)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(LOG_FILES_KEPT))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Folder {
                        path: info.path.join("logs"),
                        file_name: Some("easytask".to_string()),
                    },
                ));
            if cfg!(debug_assertions) {
                log = log.target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ));
            }
            app.handle().plugin(log.build())?;
            log::info!(
                "data folder: {} (portable: {})",
                info.path.display(),
                info.portable
            );

            // The main window is created here (create: false in tauri.conf.json) so that, in portable mode,
            // WebView2 keeps its user data folder inside the data folder.
            let config = app
                .config()
                .app
                .windows
                .first()
                .cloned()
                .ok_or("no window configured")?;
            #[allow(unused_mut)]
            let mut window = tauri::WebviewWindowBuilder::from_config(app.handle(), &config)?;
            #[cfg(windows)]
            if info.portable {
                window = window.data_directory(info.path.join("webview"));
            }
            window.build()?;

            // Updater: registered at runtime (desktop only). The public key comes from tauri.conf.json; while it
            // is still the placeholder the plugin loads fine and `check()` fails with a handled error.
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            app.manage(info);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            audio_file_exists,
            allow_audio_file,
            db_transaction,
            data_dir,
            is_portable,
            data_dir_in_onedrive,
            open_data_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use sqlx::sqlite::SqlitePoolOptions;

    fn results(ids: &[i64]) -> Vec<StmtResult> {
        ids.iter()
            .map(|id| StmtResult {
                rows_affected: 1,
                last_insert_id: *id,
            })
            .collect()
    }

    #[test]
    fn resolve_ref_valid() {
        let out = resolve_ref(&json!({ "$ref": 1 }), &results(&[5, 9]));
        assert_eq!(out, Some(Ok(9)));
    }

    #[test]
    fn resolve_ref_with_offset() {
        let out = resolve_ref(&json!({ "$ref": 0, "offset": 2 }), &results(&[10]));
        assert_eq!(out, Some(Ok(8)));
    }

    #[test]
    fn resolve_ref_index_out_of_range() {
        let out = resolve_ref(&json!({ "$ref": 3 }), &results(&[1]));
        assert!(matches!(out, Some(Err(_))));
    }

    #[test]
    fn resolve_ref_non_integer() {
        for value in [
            json!({ "$ref": "0" }),
            json!({ "$ref": -1 }),
            json!({ "$ref": 1.5 }),
        ] {
            assert!(matches!(
                resolve_ref(&value, &results(&[1, 2])),
                Some(Err(_))
            ));
        }
    }

    #[test]
    fn resolve_ref_non_reference_values() {
        let r = results(&[1]);
        assert_eq!(resolve_ref(&json!(3), &r), None);
        assert_eq!(resolve_ref(&json!("x"), &r), None);
        assert_eq!(resolve_ref(&json!({ "other": 1 }), &r), None);
    }

    fn temp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("easytask-test-{}-{name}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn is_audio_file_accepts_valid_extensions_case_insensitive() {
        let dir = temp_dir("audio");
        for name in ["a.mp3", "b.WAV", "c.Flac", "d.opus"] {
            let file = dir.join(name);
            std::fs::write(&file, b"x").unwrap();
            assert!(is_audio_file(file.to_str().unwrap()), "{name}");
        }
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn is_audio_file_rejects_wrong_missing_and_directories() {
        let dir = temp_dir("reject");
        let text = dir.join("notes.txt");
        std::fs::write(&text, b"x").unwrap();
        assert!(!is_audio_file(text.to_str().unwrap()));
        assert!(!is_audio_file(dir.join("missing.mp3").to_str().unwrap()));
        let audio_dir = dir.join("folder.mp3");
        std::fs::create_dir_all(&audio_dir).unwrap();
        assert!(!is_audio_file(audio_dir.to_str().unwrap()));
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn data_dir_defaults_to_documents_folder() {
        let exe = temp_dir("dd-exe-plain");
        let docs = temp_dir("dd-docs-plain");
        let info = resolve_data_dir(None, &exe, &docs).unwrap();
        assert_eq!(info.path, docs.join("EasyTask"));
        assert!(!info.portable);
    }

    #[test]
    fn data_dir_is_next_to_the_executable_in_portable_mode() {
        let exe = temp_dir("dd-exe-portable");
        std::fs::write(exe.join("portable.txt"), b"").unwrap();
        let info = resolve_data_dir(None, &exe, &temp_dir("dd-docs-portable")).unwrap();
        assert_eq!(info.path, exe.join("data"));
        assert!(info.portable);
    }

    #[test]
    fn data_dir_env_override_wins_and_is_not_portable() {
        let exe = temp_dir("dd-exe-env");
        let custom = temp_dir("dd-custom");
        let info = resolve_data_dir(
            Some(custom.to_str().unwrap()),
            &exe,
            &temp_dir("dd-docs-env"),
        )
        .unwrap();
        assert_eq!(info.path, custom);
        assert!(!info.portable);
    }

    #[test]
    fn data_dir_env_override_keeps_portable_flag_with_marker() {
        let exe = temp_dir("dd-exe-env-marker");
        std::fs::write(exe.join("portable.txt"), b"").unwrap();
        let custom = temp_dir("dd-custom-marker");
        let info = resolve_data_dir(
            Some(custom.to_str().unwrap()),
            &exe,
            &temp_dir("dd-docs-env-marker"),
        )
        .unwrap();
        assert_eq!(info.path, custom);
        assert!(info.portable);
    }

    #[test]
    fn data_dir_blank_env_is_ignored() {
        let exe = temp_dir("dd-exe-blank");
        let docs = temp_dir("dd-docs-blank");
        let info = resolve_data_dir(Some("  "), &exe, &docs).unwrap();
        assert_eq!(info.path, docs.join("EasyTask"));
    }

    #[test]
    fn data_dir_env_relative_path_is_rejected() {
        let exe = temp_dir("dd-exe-relative");
        let docs = temp_dir("dd-docs-relative");
        for dir in ["data", "./data", "..\\data"] {
            let error = resolve_data_dir(Some(dir), &exe, &docs).unwrap_err();
            assert!(error.contains(DATA_DIR_ENV), "{error}");
        }
    }

    #[test]
    fn single_instance_only_for_release_builds_on_the_default_data_folder() {
        assert!(single_instance_enabled(false, false));
        assert!(!single_instance_enabled(true, false));
        assert!(!single_instance_enabled(false, true));
        assert!(!single_instance_enabled(true, true));
    }

    #[test]
    fn portable_install_needs_the_marker_file() {
        let exe = temp_dir("pi-exe");
        assert!(!is_portable_install(&exe));
        std::fs::write(exe.join("portable.txt"), b"").unwrap();
        assert!(is_portable_install(&exe));
    }

    #[test]
    fn onedrive_paths_are_detected_by_component() {
        for path in [
            "C:\\Users\\me\\OneDrive\\Documents\\EasyTask",
            "C:\\Users\\me\\OneDrive - Contoso\\Documents",
            "/home/me/onedrive/EasyTask",
        ] {
            // Backslashes are only separators on Windows: build the path from components instead
            let built: PathBuf = path.split(['\\', '/']).collect();
            assert!(path_in_onedrive(&built), "{path}");
        }
        for path in ["/home/me/Documents/EasyTask", "/home/me/MyOneDrive/x"] {
            assert!(!path_in_onedrive(Path::new(path)), "{path}");
        }
    }

    async fn memory_pool() -> sqlx::SqlitePool {
        // One connection only: every in-memory connection would otherwise be a separate database.
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::query("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT NOT NULL, parent INTEGER)")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    fn stmt(sql: &str, params: Vec<serde_json::Value>) -> Stmt {
        Stmt {
            sql: sql.to_string(),
            params,
        }
    }

    async fn count(pool: &sqlx::SqlitePool) -> i64 {
        sqlx::query_scalar("SELECT COUNT(*) FROM t")
            .fetch_one(pool)
            .await
            .unwrap()
    }

    #[test]
    fn run_transaction_commits_and_resolves_refs() {
        tauri::async_runtime::block_on(async {
            let pool = memory_pool().await;
            let statements = [
                stmt("INSERT INTO t (v) VALUES (?)", vec![json!("a")]),
                stmt(
                    "INSERT INTO t (v, parent) VALUES (?, ?)",
                    vec![json!("b"), json!({ "$ref": 0 })],
                ),
            ];
            let out = run_transaction(&pool, &statements).await.unwrap();
            assert_eq!(out.len(), 2);
            assert_eq!(out[0].rows_affected, 1);
            assert_eq!(count(&pool).await, 2);
            let parent: i64 = sqlx::query_scalar("SELECT parent FROM t WHERE v = 'b'")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(parent, out[0].last_insert_id);
        });
    }

    #[test]
    fn run_transaction_rolls_back_on_error() {
        tauri::async_runtime::block_on(async {
            let pool = memory_pool().await;
            let statements = [
                stmt("INSERT INTO t (v) VALUES (?)", vec![json!("a")]),
                // NOT NULL violation
                stmt("INSERT INTO t (v) VALUES (?)", vec![json!(null)]),
            ];
            let error = run_transaction(&pool, &statements).await.unwrap_err();
            assert!(error.contains("statement 1"), "{error}");
            assert_eq!(count(&pool).await, 0);
        });
    }
}
