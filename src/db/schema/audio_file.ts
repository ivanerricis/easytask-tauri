/**
 * Creates the audio_file table in the database.
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
        FOREIGN KEY(section_groupID) REFERENCES section_group(id) ON DELETE CASCADE,
        UNIQUE(name, section_groupID)
    );`