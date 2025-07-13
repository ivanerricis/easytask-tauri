use crate::get_db_path;
use rusqlite::{params, Connection};
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize, Debug, Clone)]
pub struct Folder {
    pub id: i64,
    pub workspace_id: Option<i64>,
    pub folder_id: Option<i64>,
    pub name: String,
    pub color: String,
    // #[serde(skip_serializing)]
    pub creation_date: String,
    // #[serde(skip_serializing)]
    pub creation_time: String,
    // #[serde(skip_serializing)]
    pub edit_date: String,
    // #[serde(skip_serializing)]
    pub edit_time: String,
    pub subfolders: Vec<Folder>,
    pub notes: Vec<Note>,
}

#[derive(Serialize, Debug, Clone)]
pub struct Note {
    pub id: i64,
    pub workspace_id: Option<i64>,
    pub folder_id: Option<i64>,
    pub name: String,
    pub color: String,
    pub groups: Vec<()>, // Vuoto come nella versione TS
    // #[serde(skip_serializing)]
    pub creation_date: String,
    // #[serde(skip_serializing)]
    pub creation_time: String,
    // #[serde(skip_serializing)]
    pub edit_date: String,
    // #[serde(skip_serializing)]
    pub edit_time: String,
}

#[derive(Serialize, Clone)]
pub struct Task {
    pub id: i64,
    pub section_id: i64,
    pub task_id: Option<i64>,
    pub text: String,
    pub color: Option<String>,
    pub completed: bool,
    pub subtasks: Vec<Task>,
}

#[derive(Serialize, Clone)]
pub struct Section {
    pub id: i64,
    pub group_id: i64,
    pub title: String,
    pub color: Option<String>,
    pub tasks: Vec<Task>,
}

#[derive(Serialize, Clone)]
pub struct SectionGroup {
    pub id: i64,
    pub note_id: i64,
    pub position: i64,
    pub sections: Vec<Section>,
}

#[derive(Serialize, Clone)]
pub struct NoteData {
    pub groups: Vec<SectionGroup>,
}

#[derive(Serialize, Clone)]
pub struct WorkspaceData {
    pub folders: Vec<Folder>,
    pub notes: Vec<Note>,
}

#[tauri::command]
pub fn get_note_data(note_id: i64) -> Result<NoteData, String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;

    // 1. Recupera tutti i gruppi della nota
    let mut stmt = conn
        .prepare(
            "SELECT id, note_id, position FROM section_group WHERE note_id = ? ORDER BY position",
        )
        .map_err(|e| e.to_string())?;

    let groups: Vec<SectionGroup> = stmt
        .query_map(params![note_id], |row| {
            Ok(SectionGroup {
                id: row.get(0)?,
                note_id: row.get(1)?,
                position: row.get(2)?,
                sections: Vec::new(), // Popolato dopo
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 2. Funzione helper ricorsiva per i task
    fn get_tasks_recursively(
        conn: &Connection,
        section_id: i64,
        parent_task_id: Option<i64>,
    ) -> Result<Vec<Task>, rusqlite::Error> {
        let mut stmt = conn.prepare(
            "SELECT id, section_id, task_id, text, color, completed 
             FROM task 
             WHERE section_id = ? AND task_id IS ?",
        )?;

        let tasks = stmt
            .query_map(params![section_id, parent_task_id], |row| {
                Ok(Task {
                    id: row.get(0)?,
                    section_id: row.get(1)?,
                    task_id: row.get(2)?,
                    text: row.get(3)?,
                    color: row.get(4)?,
                    completed: row.get(5)?,
                    subtasks: Vec::new(), // Popolato ricorsivamente
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        // Popola ricorsivamente i subtask
        let mut tasks_with_subtasks = Vec::new();
        for mut task in tasks {
            task.subtasks = get_tasks_recursively(conn, section_id, Some(task.id))?;
            tasks_with_subtasks.push(task);
        }

        Ok(tasks_with_subtasks)
    }

    // 3. Per ogni gruppo, recupera le sezioni e i task
    let mut full_groups = Vec::new();
    for mut group in groups {
        let mut stmt = conn
            .prepare("SELECT id, group_id, title, color FROM section WHERE group_id = ?")
            .map_err(|e| e.to_string())?;

        let sections = stmt
            .query_map(params![group.id], |row| {
                Ok(Section {
                    id: row.get(0)?,
                    group_id: row.get(1)?,
                    title: row.get(2)?,
                    color: row.get(3)?,
                    tasks: Vec::new(), // Popolato dopo
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        // Popola i task per ogni sezione
        let mut sections_with_tasks = Vec::new();
        for mut section in sections {
            section.tasks =
                get_tasks_recursively(&conn, section.id, None).map_err(|e| e.to_string())?;
            sections_with_tasks.push(section);
        }

        group.sections = sections_with_tasks;
        full_groups.push(group);
    }

    Ok(NoteData {
        groups: full_groups,
    })
}

#[tauri::command]
pub fn get_workspace_data(workspace_id: i64) -> Result<WorkspaceData, String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;

    // 1. Recupera tutte le cartelle
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, folder_id, name, color, 
                creation_date, creation_time, edit_date, edit_time 
         FROM folder 
         WHERE workspace_id = ? OR folder_id IS NOT NULL",
        )
        .map_err(|e| e.to_string())?;

    let all_folders: Vec<Folder> = stmt
        .query_map(params![workspace_id], |row| {
            Ok(Folder {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                folder_id: row.get(2)?,
                name: row.get(3)?,
                color: row.get(4)?,
                creation_date: row.get(5)?,
                creation_time: row.get(6)?,
                edit_date: row.get(7)?,
                edit_time: row.get(8)?,
                subfolders: Vec::new(),
                notes: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 2. Recupera tutte le note
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, folder_id, name, color, 
                creation_date, creation_time, edit_date, edit_time 
         FROM note 
         WHERE workspace_id = ? 
            OR folder_id IN (SELECT id FROM folder WHERE workspace_id = ? OR folder_id IS NOT NULL)"
    ).map_err(|e| e.to_string())?;

    let all_notes: Vec<Note> = stmt
        .query_map(params![workspace_id, workspace_id], |row| {
            Ok(Note {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                folder_id: row.get(2)?,
                name: row.get(3)?,
                color: row.get(4)?,
                groups: Vec::new(),
                creation_date: row.get(5)?,
                creation_time: row.get(6)?,
                edit_date: row.get(7)?,
                edit_time: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 3. Costruisci le mappe per la gerarchia
    let mut folder_map: HashMap<i64, Folder> = HashMap::new();
    let mut folder_children_map: HashMap<i64, Vec<Folder>> = HashMap::new();
    let mut folder_notes_map: HashMap<i64, Vec<Note>> = HashMap::new();
    let mut root_folders: Vec<Folder> = Vec::new();

    for folder in &all_folders {
        let folder_id = folder.id;
        folder_map.insert(folder_id, folder.clone());

        // Clona solo i dati necessari per le mappe
        let folder_for_hierarchy = Folder {
            id: folder_id,
            workspace_id: folder.workspace_id,
            folder_id: folder.folder_id,
            name: folder.name.clone(),
            color: folder.color.clone(),
            creation_date: String::new(),
            creation_time: String::new(),
            edit_date: String::new(),
            edit_time: String::new(),
            subfolders: Vec::new(),
            notes: Vec::new(),
        };

        if let Some(parent_id) = folder.folder_id {
            folder_children_map
                .entry(parent_id)
                .or_insert_with(Vec::new)
                .push(folder_for_hierarchy);
        } else {
            root_folders.push(folder_for_hierarchy);
        }
    }

    // 4. Organizza le note per cartella
    for note in &all_notes {
        if let Some(folder_id) = note.folder_id {
            folder_notes_map
                .entry(folder_id)
                .or_insert_with(Vec::new)
                .push(note.clone());
        }
    }

    // 5. Funzione ricorsiva per costruire la gerarchia
    fn attach_subfolders(
        folder: &mut Folder,
        folder_children_map: &HashMap<i64, Vec<Folder>>,
        folder_notes_map: &HashMap<i64, Vec<Note>>,
    ) {
        if let Some(children) = folder_children_map.get(&folder.id) {
            for mut child in children.clone() {
                attach_subfolders(&mut child, folder_children_map, folder_notes_map);
                folder.subfolders.push(child);
            }
        }

        if let Some(notes) = folder_notes_map.get(&folder.id) {
            folder.notes = notes.clone();
        }
    }

    // 6. Costruisci la gerarchia completa
    for folder in &mut root_folders {
        attach_subfolders(folder, &folder_children_map, &folder_notes_map);
    }

    // 7. Note senza cartella
    let notes_without_folder: Vec<Note> = all_notes
        .iter()
        .filter(|note| note.folder_id.is_none())
        .cloned()
        .collect();

    Ok(WorkspaceData {
        folders: root_folders,
        notes: notes_without_folder,
    })
}
