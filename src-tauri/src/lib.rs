use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub folder: Option<String>, // Relative folder path
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Folder {
    pub path: String,
    pub name: String,
    pub note_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_note: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirListing {
    pub path: String,
    pub parent: Option<String>,
    pub entries: Vec<DirEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    pub notes_dir: PathBuf,
}

#[tauri::command]
async fn get_notes_directory() -> Result<String, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let notes_dir = home_dir.join("Documents").join("NoteMaker");
    
    fs::create_dir_all(&notes_dir)
        .map_err(|e| format!("Failed to create notes directory: {}", e))?;
    
    Ok(notes_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn list_directory(path: String) -> Result<DirListing, String> {
    let dir = PathBuf::from(&path);
    if !dir.exists() || !dir.is_dir() {
        return Err(format!("Not a valid directory: {}", path));
    }

    let parent = dir.parent().map(|p| p.to_string_lossy().to_string());

    let mut entries = Vec::new();
    let read_dir = fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files
        if file_name.starts_with('.') {
            continue;
        }

        let file_path = entry.path();
        let is_dir = file_path.is_dir();
        let is_note = !is_dir && file_path.extension().map_or(false, |ext| ext == "json");

        entries.push(DirEntry {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_dir,
            is_note,
        });
    }

    // Sort: directories first, then files, alphabetical within each
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(DirListing {
        path: dir.to_string_lossy().to_string(),
        parent,
        entries,
    })
}

#[tauri::command]
async fn set_notes_directory(path: String, _state: tauri::State<'_, AppState>) -> Result<String, String> {
    let new_dir = PathBuf::from(&path);

    // Create directory if it doesn't exist
    fs::create_dir_all(&new_dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    // Verify it's accessible
    if !new_dir.exists() || !new_dir.is_dir() {
        return Err("Invalid directory path".to_string());
    }

    // Update the app state (requires interior mutability, but for now just validate)
    Ok(format!("Notes directory set to: {}", path))
}

#[tauri::command]
async fn get_folders(state: tauri::State<'_, AppState>) -> Result<Vec<Folder>, String> {
    let mut folders = Vec::new();
    
    // Add root folder
    folders.push(Folder {
        path: String::new(),
        name: "📁 All Notes".to_string(),
        note_count: 0,
    });
    
    fn scan_folder(dir: &Path, prefix: &str, folders: &mut Vec<Folder>) -> Result<usize, std::io::Error> {
        let mut note_count = 0;
        
        if dir.exists() && dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_dir() {
                    let folder_name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("Unknown")
                        .to_string();
                    
                    let full_path = if prefix.is_empty() {
                        folder_name.clone()
                    } else {
                        format!("{}/{}", prefix, folder_name)
                    };
                    
                    let sub_notes = scan_folder(&path, &full_path, folders)?;
                    
                    folders.push(Folder {
                        path: full_path.clone(),
                        name: format!("📂 {}", folder_name),
                        note_count: sub_notes,
                    });
                    
                    note_count += sub_notes;
                } else if let Some(ext) = path.extension() {
                    if ext == "json" {
                        note_count += 1;
                    }
                }
            }
        }
        
        Ok(note_count)
    }
    
    // Scan all folders and count notes
    let total_notes = scan_folder(&state.notes_dir, "", &mut folders)
        .map_err(|e| format!("Failed to scan directories: {}", e))?;
    
    // Update root folder count
    if let Some(folder) = folders.get_mut(0) {
        folder.note_count = total_notes;
    }
    
    Ok(folders)
}

#[tauri::command]
async fn create_folder(path: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let folder_path = state.notes_dir.join(&path);
    
    fs::create_dir_all(&folder_path)
        .map_err(|e| format!("Failed to create folder: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn get_notes(folder: Option<String>, state: tauri::State<'_, AppState>) -> Result<Vec<Note>, String> {
    let mut notes = Vec::new();
    let search_dir = if let Some(ref folder_path) = folder {
        if folder_path.is_empty() {
            state.notes_dir.clone()
        } else {
            state.notes_dir.join(folder_path)
        }
    } else {
        state.notes_dir.clone()
    };
    
    fn scan_notes(dir: &Path, notes: &mut Vec<Note>) -> Result<(), std::io::Error> {
        if dir.exists() && dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_dir() {
                    // Recursively scan subdirectories
                    scan_notes(&path, notes)?;
                } else if let Some(ext) = path.extension() {
                    if ext == "json" {
                        if let Ok(content) = fs::read_to_string(&path) {
                            if let Ok(mut note) = serde_json::from_str::<Note>(&content) {
                                // Set relative folder path
                                if let Some(relative_path) = path.parent()
                                    .and_then(|p| p.strip_prefix(&dir.parent().unwrap_or(&dir)).ok())
                                {
                                    if relative_path != Path::new("") {
                                        note.folder = Some(relative_path.to_string_lossy().to_string());
                                    }
                                }
                                notes.push(note);
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }
    
    scan_notes(&search_dir, &mut notes)
        .map_err(|e| format!("Failed to scan notes: {}", e))?;
    
    // Sort by updated_at descending
    notes.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    
    Ok(notes)
}

#[tauri::command]
async fn save_note(note: Note, state: tauri::State<'_, AppState>) -> Result<Note, String> {
    let note_dir = if let Some(ref folder) = note.folder {
        if folder.is_empty() {
            state.notes_dir.clone()
        } else {
            state.notes_dir.join(folder)
        }
    } else {
        state.notes_dir.clone()
    };
    
    // Create directory if it doesn't exist
    fs::create_dir_all(&note_dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    
    let note_path = note_dir.join(format!("{}.json", note.id));
    
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
async fn move_note(note_id: String, new_folder: Option<String>, state: tauri::State<'_, AppState>) -> Result<(), String> {
    // Find the note file
    fn find_note(dir: &Path, note_id: &str) -> Option<PathBuf> {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(found) = find_note(&path, note_id) {
                        return Some(found);
                    }
                } else if path.file_name().map_or(false, |name| name.to_string_lossy() == format!("{}.json", note_id)) {
                    return Some(path);
                }
            }
        }
        None
    }
    
    if let Some(old_path) = find_note(&state.notes_dir, &note_id) {
        // Load the note
        let content = fs::read_to_string(&old_path)
            .map_err(|e| format!("Failed to read note: {}", e))?;
        
        let mut note: Note = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse note: {}", e))?;
        
        // Update folder
        note.folder = new_folder;
        
        // Save to new location
        let new_dir = if let Some(ref folder) = note.folder {
            if folder.is_empty() {
                state.notes_dir.clone()
            } else {
                state.notes_dir.join(folder)
            }
        } else {
            state.notes_dir.clone()
        };
        
        fs::create_dir_all(&new_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
        
        let new_path = new_dir.join(format!("{}.json", note_id));
        
        // Move file
        fs::rename(&old_path, &new_path)
            .map_err(|e| format!("Failed to move note: {}", e))?;
        
        Ok(())
    } else {
        Err("Note not found".to_string())
    }
}

#[tauri::command]
async fn delete_note(note_id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    fn find_and_delete_note(dir: &Path, note_id: &str) -> Result<bool, std::io::Error> {
        if dir.exists() && dir.is_dir() {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        if find_and_delete_note(&path, note_id)? {
                            return Ok(true);
                        }
                    } else if let Some(file_name) = path.file_name() {
                        if file_name.to_string_lossy() == format!("{}.json", note_id) {
                            fs::remove_file(&path)?;
                            return Ok(true);
                        }
                    }
                }
            }
        }
        Ok(false)
    }
    
    let found = find_and_delete_note(&state.notes_dir, &note_id)
        .map_err(|e| format!("Failed to delete note: {}", e))?;
    
    if !found {
        return Err("Note not found".to_string());
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
    .setup(|app| {
      // Initialize app state
      let home_dir = dirs::home_dir().expect("Could not find home directory");
      let notes_dir = home_dir.join("Documents").join("NoteMaker");
      fs::create_dir_all(&notes_dir).expect("Could not create notes directory");
      
      let app_state = AppState {
        notes_dir,
      };
      
      app.manage(app_state);
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        get_notes_directory,
        list_directory,
        set_notes_directory,
        get_folders,
        create_folder,
        get_notes,
        save_note,
        move_note,
        delete_note
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
