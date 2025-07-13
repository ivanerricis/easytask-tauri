export const createSectionGroupTable =  `
    CREATE TABLE IF NOT EXISTS section_group (
        id INTEGER PRIMARY KEY,
        note_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        FOREIGN KEY(note_id) REFERENCES note(id) ON DELETE CASCADE
    );
`