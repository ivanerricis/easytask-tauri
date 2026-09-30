/**
 * Creates the audio_file table in the database (soft delete through deleted_at, manual order through position).
 * UNIQUE(name, section_groupID) also covers the trashed rows, so a file can always be restored
 * without name conflicts; the insert query generates a unique name ("song (2).mp3") for duplicates.
 * @category Database Schema
 */
export const createTableAudioFile = `
    CREATE TABLE IF NOT EXISTS audio_file (
        id INTEGER PRIMARY KEY,
        section_groupID INTEGER NOT NULL,
        name TEXT NOT NULL CHECK (LENGTH(name) > 0),
        path TEXT NOT NULL CHECK (LENGTH(path) > 0),
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        deleted_at TEXT DEFAULT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(section_groupID) REFERENCES section_group(id) ON DELETE CASCADE,
        UNIQUE(name, section_groupID)
    );
`

/**
 * Indexes of the audio_file table.
 * @category Database Schema
 */
export const createAudioFileIndexes = `
    CREATE INDEX IF NOT EXISTS idx_audio_file_group ON audio_file(section_groupID);
`
