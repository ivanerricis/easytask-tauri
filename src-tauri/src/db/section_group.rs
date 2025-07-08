pub const CREATE_SECTIONGROUP_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS section_group (
        id INTEGER PRIMARY KEY,
        note_id INTEGER NOT NULL,
        position TEXT NOT NULL,
        FOREIGN KEY(note_id) REFERENCES note(id) ON DELETE CASCADE
    );
"#;
