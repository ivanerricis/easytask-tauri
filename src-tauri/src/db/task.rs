use crate::get_db_path;
use rusqlite::{params, Connection};

pub const CREATE_TASK_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS task (
        id INTEGER PRIMARY KEY,
        section_id INTEGER,
        task_id INTEGER,
        text TEXT NOT NULL CHECK (LENGTH(text) > 0),
        description TEXT,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        priority INTEGER NOT NULL DEFAULT 0,
        archived BOOLEAN NOT NULL DEFAULT FALSE,
        color TEXT CHECK (LENGTH(color) > 0),
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        FOREIGN KEY(section_id) REFERENCES section(id) ON DELETE CASCADE,
        FOREIGN KEY(task_id) REFERENCES task(id) ON DELETE CASCADE
        UNIQUE(text, section_id)
    );

    CREATE TRIGGER IF NOT EXISTS update_task_edit_timestamp
    AFTER UPDATE ON task
    FOR EACH ROW
    BEGIN
        UPDATE task
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
    WHERE id = OLD.id;
    END;
"#;

#[tauri::command]
pub fn create_task(section_id: i64, text: String, color: Option<String>) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let res = match color {
        Some(color) => conn.execute(
            "INSERT INTO task (section_id, text, color) VALUES (?, ?, ?)",
            params![section_id, text, color],
        ),
        None => conn.execute(
            "INSERT INTO task (section_id, text) VALUES (?, ?)",
            params![section_id, text],
        ),
    };
    handle_sql_error(res)
}

#[tauri::command]
pub fn delete_task(id: i64) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM task WHERE id=?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn handle_sql_error(res: rusqlite::Result<usize>) -> Result<(), String> {
    match res {
        Ok(_) => Ok(()),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("CHECK constraint failed") {
                Err("EMPTY_TEXT".into())
            } else {
                Err("GENERIC_ERROR".into())
            }
        }
    }
}
