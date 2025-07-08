// main.rs
mod db;

use dirs_next::document_dir;
use std::path::PathBuf;
use std::sync::OnceLock;

static DB_PATH: OnceLock<String> = OnceLock::new();

pub fn get_db_path() -> &'static str {
    DB_PATH.get().expect("Database path not initialized")
}

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            let mut db_path = document_dir().unwrap_or_else(|| PathBuf::from("."));
            db_path.push("EasyTask");
            std::fs::create_dir_all(&db_path)
                .map_err(|e| format!("Errore creazione cartella database: {e}"))?;
            db_path.push("easytask-tauri.db");
            let db_path_str = db_path.to_str().unwrap().to_string();

            DB_PATH.set(db_path_str.clone()).unwrap();
            db::init_database(&db_path_str)
                .map_err(|e| format!("Errore durante la creazione del database: {e}"))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db::workspace::get_workspaces,
            db::workspace::create_workspace,
            db::workspace::edit_workspace,
            db::workspace::delete_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("Errore nell'avvio dell'app Tauri");
}
