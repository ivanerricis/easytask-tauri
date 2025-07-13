use crate::get_db_path;
use rusqlite::{params, Connection};

pub const CREATE_SECTION_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS section (
        id INTEGER PRIMARY KEY,
        group_id INTEGER NOT NULL,
        title TEXT NOT NULL CHECK (LENGTH(title) > 0),
        color TEXT CHECK (LENGTH(color) > 0),
        archived BOOLEAN NOT NULL DEFAULT FALSE,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        FOREIGN KEY(group_id) REFERENCES section_group(id) ON DELETE CASCADE,
        UNIQUE(title, group_id)
    );

    CREATE TRIGGER IF NOT EXISTS update_section_edit_timestamp
    AFTER UPDATE ON section
    FOR EACH ROW
    BEGIN
        UPDATE section
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
    WHERE id = OLD.id;
    END;
"#;

#[tauri::command]
pub fn create_section_in_group(
    group_id: i64,
    title: String,
    color: Option<String>,
) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let res = match color {
        Some(color) => conn.execute(
            "INSERT INTO section (group_id, title, color) VALUES (?, ?, ?)",
            params![group_id, title, color],
        ),
        None => conn.execute(
            "INSERT INTO section (group_id, title) VALUES (?, ?)",
            params![group_id, title],
        ),
    };
    handle_sql_error(res)
}

#[tauri::command]
pub fn create_section(
    note_id: i64,
    title: String,
    position: i64,
    color: Option<String>,
) -> Result<(), String> {
    let mut conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Create the group first
    tx.execute(
        "INSERT INTO section_group (note_id, position) VALUES (?, ?)",
        params![note_id, position],
    )
    .map_err(|e| e.to_string())?;

    let group_id = tx.last_insert_rowid();

    // Then create the section
    let res = match color {
        Some(color) => tx.execute(
            "INSERT INTO section (group_id, title, color) VALUES (?, ?, ?)",
            params![group_id, title, color],
        ),
        None => tx.execute(
            "INSERT INTO section (group_id, title) VALUES (?, ?)",
            params![group_id, title],
        ),
    };

    match res {
        Ok(_) => {
            tx.commit().map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("CHECK constraint failed") {
                Err("EMPTY_TITLE".into())
            } else {
                Err("GENERIC_ERROR".into())
            }
        }
    }
}

#[tauri::command]
pub fn delete_section(id: i64) -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;

    // Check if this is the last section in the group
    let group_id: i64 = conn
        .query_row(
            "SELECT group_id FROM section WHERE id = ?",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let section_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM section WHERE group_id = ?",
            params![group_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if section_count == 1 {
        // Delete the entire group if this is the last section
        conn.execute("DELETE FROM section_group WHERE id = ?", params![group_id])
            .map_err(|e| e.to_string())?;
    } else {
        // Just delete the section
        conn.execute("DELETE FROM section WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn handle_sql_error(res: rusqlite::Result<usize>) -> Result<(), String> {
    match res {
        Ok(_) => Ok(()),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("CHECK constraint failed") {
                Err("EMPTY_TITLE".into())
            } else {
                Err("GENERIC_ERROR".into())
            }
        }
    }
}
