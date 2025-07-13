use serde::Serialize;

#[derive(Serialize)]
pub struct Workspace {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub creation_date: String,
    pub creation_time: String,
    pub edit_date: String,
    pub edit_time: String,
}

#[derive(Serialize)]
pub struct Folder {
    pub id: i64,
    pub workspace_id: Option<i64>,
    pub folder_id: Option<i64>,
    pub name: String,
    pub color: String,
    pub creation_date: String,
    pub creation_time: String,
    pub edit_date: String,
    pub edit_time: String,
    pub notes: Vec<Note>,
}

#[derive(Serialize)]
pub struct Note {
    pub id: i64,
    pub workspace_id: Option<i64>,
    pub folder_id: Option<i64>,
    pub name: String,
    pub color: String,
    pub creation_date: String,
    pub creation_time: String,
    pub edit_date: String,
    pub edit_time: String,
}

#[derive(Serialize)]
pub struct SectionGroup {
    pub id: i64,
    pub note_id: i64,
    pub position: i64,
    pub sections: Vec<Section>,
}

#[derive(Serialize)]
pub struct Section {
    pub id: i64,
    pub group_id: i64,
    pub title: String,
    pub color: Option<String>,
}

#[derive(Serialize)]
pub struct Task {
    pub id: i64,
    pub section_id: i64,
    pub task_id: Option<i64>,
    pub text: String,
    pub color: Option<String>,
    pub completed: bool,
}
