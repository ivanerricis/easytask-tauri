use crate::get_db_path;
use rusqlite::{params, Connection};

pub const CREATE_NOTE_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS note (
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
        FOREIGN KEY(folder_id) REFERENCES folder(id) ON DELETE CASCADE,
        UNIQUE(name, workspace_id),
        UNIQUE(name, folder_id)
    );

    CREATE TRIGGER IF NOT EXISTS update_note_edit_timestamp
    AFTER UPDATE ON note
    FOR EACH ROW
    BEGIN
        UPDATE note
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
    WHERE id = OLD.id;
    END;
"#;

#[tauri::command]
pub fn create_workspace_note(workspace_id: i64, name: String, color: String) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let res = conn.execute(
        "INSERT INTO note (workspace_id, name, color) VALUES (?, ?, ?)",
        params![workspace_id, name, color],
    );
    handle_sql_error(res)
}

#[tauri::command]
pub fn create_note_in_folder(folder_id: i64, name: String, color: String) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let res = conn.execute(
        "INSERT INTO note (folder_id, name, color) VALUES (?, ?, ?)",
        params![folder_id, name, color],
    );
    handle_sql_error(res)
}

#[tauri::command]
pub fn edit_note(id: i64, name: String, color: String) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let res = conn.execute(
        "UPDATE note SET name=?, color=? WHERE id=?",
        params![name, color, id],
    );
    handle_sql_error(res)
}

#[tauri::command]
pub fn delete_note(id: i64) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM note WHERE id=?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn handle_sql_error(res: rusqlite::Result<usize>) -> Result<(), String> {
    match res {
        Ok(_) => Ok(()),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("UNIQUE constraint failed") {
                Err("NOTE_EXISTS".into())
            } else if msg.contains("CHECK constraint failed") {
                Err("EMPTY_NAME".into())
            } else {
                Err("GENERIC_ERROR".into())
            }
        }
    }
}
