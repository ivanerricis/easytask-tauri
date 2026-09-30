use std::path::Path;
use tauri::Manager;

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
#[derive(serde::Serialize)]
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
        None => Err(format!("$ref {index} does not point to an earlier statement")),
    })
}

/// Runs several statements atomically on the pool loaded by tauri-plugin-sql (same `db` key passed to
/// `Database.load`). All statements share one connection inside a transaction: committed if every
/// statement succeeds, rolled back (by dropping the transaction) on the first error.
#[tauri::command]
async fn db_transaction(
    db_instances: tauri::State<'_, tauri_plugin_sql::DbInstances>,
    db: String,
    statements: Vec<Stmt>,
) -> Result<Vec<StmtResult>, String> {
    use sqlx::Executor;

    let instances = db_instances.0.read().await;
    let pool = match instances.get(&db) {
        Some(tauri_plugin_sql::DbPool::Sqlite(pool)) => pool,
        None => return Err(format!("database {db} is not loaded")),
    };

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init());

    if cfg!(debug_assertions) {
        builder = builder.plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        );
    }

    builder
        .invoke_handler(tauri::generate_handler![
            audio_file_exists,
            allow_audio_file,
            db_transaction
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
