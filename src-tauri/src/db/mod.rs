pub mod folder;
pub mod note;
pub mod section;
pub mod section_group;
pub mod task;
pub mod workspace;
use rusqlite::{Connection, Result};

pub fn init_database(db_path: &str) -> Result<()> {
    let conn = Connection::open(db_path)?;
    let schema = [
        workspace::CREATE_WORKSPACE_TABLE,
        folder::CREATE_FOLDER_TABLE,
        note::CREATE_NOTE_TABLE,
        section_group::CREATE_SECTIONGROUP_TABLE,
        section::CREATE_SECTION_TABLE,
        task::CREATE_TASK_TABLE,
    ]
    .join("\n");

    conn.execute_batch(&schema)?;

    Ok(())
}
