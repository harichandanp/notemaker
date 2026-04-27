use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    pub notes: HashMap<String, Note>,
    pub notes_dir: PathBuf,
}

#[tauri::command]
async fn get_notes(state: tauri::State<'_, AppState>) -> Result<Vec<Note>, String> {
    let mut notes = Vec::new();
    
    if let Ok(entries) = fs::read_dir(&state.notes_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    if let Ok(content) = fs::read_to_string(entry.path()) {
                        if let Ok(note) = serde_json::from_str::<Note>(&content) {
                            notes.push(note);
                        }
                    }
                }
            }
        }
    }
    
    // Sort by updated_at descending
    notes.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    
    Ok(notes)
}

#[tauri::command]
async fn save_note(note: Note, state: tauri::State<'_, AppState>) -> Result<Note, String> {
    let note_path = state.notes_dir.join(format!("{}.json", note.id));
    
    let updated_note = Note {
        updated_at: Utc::now(),
        ..note
    };
    
    let json_content = serde_json::to_string_pretty(&updated_note)
        .map_err(|e| format!("Failed to serialize note: {}", e))?;
    
    fs::write(note_path, json_content)
        .map_err(|e| format!("Failed to save note: {}", e))?;
    
    Ok(updated_note)
}

#[tauri::command]
async fn delete_note(note_id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let note_path = state.notes_dir.join(format!("{}.json", note_id));
    
    fs::remove_file(note_path)
        .map_err(|e| format!("Failed to delete note: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn get_notes_directory() -> Result<String, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let notes_dir = home_dir.join("Documents").join("NoteMaker");
    
    fs::create_dir_all(&notes_dir)
        .map_err(|e| format!("Failed to create notes directory: {}", e))?;
    
    Ok(notes_dir.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
    .setup(|app| {
      // Initialize app state
      let home_dir = dirs::home_dir().expect("Could not find home directory");
      let notes_dir = home_dir.join("Documents").join("NoteMaker");
      fs::create_dir_all(&notes_dir).expect("Could not create notes directory");
      
      let app_state = AppState {
        notes: HashMap::new(),
        notes_dir,
      };
      
      app.manage(app_state);
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        get_notes,
        save_note,
        delete_note,
        get_notes_directory
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
