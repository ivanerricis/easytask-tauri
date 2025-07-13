use crate::get_db_path;
use rusqlite::{params, Connection};

pub const CREATE_FOLDER_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS folder (
        id INTEGER PRIMARY KEY,
        workspace_id INTEGER,
        folder_id INTEGER,
        name TEXT NOT NULL CHECK (LENGTH(name) > 0),
        color TEXT NOT NULL CHECK (LENGTH(color) > 0),
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        FOREIGN KEY(workspace_id) REFERENCES workspace(id) ON DELETE CASCADE,
        FOREIGN KEY(folder_id) REFERENCES folder(id) ON DELETE CASCADE
        UNIQUE(workspace_id, name)
        UNIQUE(folder_id, name)
    );

    CREATE TRIGGER IF NOT EXISTS update_folder_edit_timestamp
    AFTER UPDATE ON folder
    FOR EACH ROW
    BEGIN
        UPDATE folder
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
    WHERE id = OLD.id;
    END;
"#;

#[tauri::command]
pub fn create_workspace_folder(
    workspace_id: i64,
    name: String,
    color: String,
) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let res = conn.execute(
        "INSERT INTO folder (workspace_id, name, color) VALUES (?, ?, ?)",
        params![workspace_id, name, color],
    );
    handle_sql_error(res)
}

#[tauri::command]
pub fn create_sub_folder(folder_id: i64, name: String, color: String) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let res = conn.execute(
        "INSERT INTO folder (folder_id, name, color) VALUES (?, ?, ?)",
        params![folder_id, name, color],
    );
    handle_sql_error(res)
}

#[tauri::command]
pub fn edit_folder(id: i64, name: String, color: String) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let res = conn.execute(
        "UPDATE folder SET name=?, color=? WHERE id=?",
        params![name, color, id],
    );
    handle_sql_error(res)
}

#[tauri::command]
pub fn delete_folder(id: i64) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM folder WHERE id=?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn handle_sql_error(res: rusqlite::Result<usize>) -> Result<(), String> {
    match res {
        Ok(_) => Ok(()),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("UNIQUE constraint failed") {
                Err("FOLDER_EXISTS".into())
            } else if msg.contains("CHECK constraint failed") {
                Err("EMPTY_NAME".into())
            } else {
                Err("GENERIC_ERROR".into())
            }
        }
    }
}
