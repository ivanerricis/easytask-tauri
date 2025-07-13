use crate::db::types::Workspace;
use crate::get_db_path;
use rusqlite::{params, Connection};

pub const CREATE_WORKSPACE_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS workspace (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (LENGTH(name) > 0),
  color TEXT NOT NULL CHECK (LENGTH(color) > 0),
  creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
  creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
  edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
  edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime'))
);

CREATE TRIGGER IF NOT EXISTS update_workspace_edit_timestamp
    AFTER UPDATE ON workspace
    FOR EACH ROW
    BEGIN
        UPDATE workspace
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
    WHERE id = OLD.id;
    END;
"#;

#[tauri::command]
pub fn get_workspaces() -> Result<Vec<Workspace>, String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, color, creation_date, creation_time, edit_date, edit_time
         FROM workspace ORDER BY edit_date DESC, edit_time DESC",
        )
        .map_err(|e| e.to_string())?;

    let workspaces = stmt
        .query_map([], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                creation_date: row.get(3)?,
                creation_time: row.get(4)?,
                edit_date: row.get(5)?,
                edit_time: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(workspaces)
}

#[tauri::command]
pub fn create_workspace(name: String, color: String) -> Result<(), String> {
    let mut conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let res = tx.execute(
        "INSERT INTO workspace (name, color) VALUES (?, ?)",
        params![name, color],
    );
    match res {
        Ok(_) => {
            tx.commit().map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("UNIQUE constraint failed") {
                Err("WORKSPACE_EXISTS".into())
            } else if msg.contains("CHECK constraint failed") {
                Err("EMPTY_NAME".into())
            } else {
                Err("GENERIC_ERROR".into())
            }
        }
    }
}

#[tauri::command]
pub fn edit_workspace(id: i64, name: String, color: String) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let res = conn.execute(
        "UPDATE workspace SET name=?, color=? WHERE id=?",
        params![name, color, id],
    );
    match res {
        Ok(_) => Ok(()),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("UNIQUE constraint failed") {
                Err("WORKSPACE_EXISTS".into())
            } else if msg.contains("CHECK constraint failed") {
                Err("EMPTY_NAME".into())
            } else {
                Err("GENERIC_ERROR".into())
            }
        }
    }
}

#[tauri::command]
pub fn delete_workspace(id: i64) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM workspace WHERE id=?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
