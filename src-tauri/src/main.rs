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
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
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
            // Workspace methods
            db::workspace::get_workspaces,
            db::workspace::create_workspace,
            db::workspace::edit_workspace,
            db::workspace::delete_workspace,
            // Folder methods
            db::folder::create_workspace_folder,
            db::folder::create_sub_folder,
            db::folder::edit_folder,
            db::folder::delete_folder,
            // Note methods
            db::note::create_workspace_note,
            db::note::create_note_in_folder,
            db::note::edit_note,
            db::note::delete_note,
            // Section methods
            db::section::create_section_in_group,
            db::section::create_section,
            db::section::delete_section,
            // Task methods
            db::task::create_task,
            db::task::delete_task,
            // NoteData methods
            db::workspace_data::get_workspace_data,
            db::workspace_data::get_note_data,
        ])
        .run(tauri::generate_context!())
        .expect("Errore nell'avvio dell'app Tauri");
}
