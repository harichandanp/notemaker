# 🛠️ Development Guide

## Quick Start for New Developers

### 1. Environment Setup (5 minutes)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Install Tauri CLI
cargo install tauri-cli

# Verify installation
cargo --version
cargo tauri --version
```

### 2. Run the App

```bash
cd /Users/hari/notemaker
cargo tauri dev
```

That's it! The app will open in a new window.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Tauri Bridge  │    │   Rust Backend  │
│                 │    │                 │    │                 │
│ HTML/CSS/JS     │◄──►│   invoke()      │◄──►│   Commands      │
│ • UI            │    │   __TAURI__     │    │ • File I/O      │
│ • Markdown      │    │                 │    │ • Note Logic    │
│ • Events        │    │                 │    │ • Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Code Walkthrough

### Frontend (`app.js`)

```javascript
// Main class that handles everything
class NoteMaker {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.init();
    }
    
    // Key methods:
    async loadNotes()    // Calls Rust backend
    async saveNote()     // Calls Rust backend  
    updatePreview()      // Renders markdown
    createNewNote()      // UI logic
}
```

### Backend (`src-tauri/src/lib.rs`)

```rust
// Data structures
#[derive(Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Tauri commands (called from frontend)
#[tauri::command]
async fn get_notes() -> Result<Vec<Note>, String>

#[tauri::command] 
async fn save_note(note: Note) -> Result<Note, String>
```

## 🔄 Adding New Features

### Step 1: Add Rust Command

```rust
// In src-tauri/src/lib.rs
#[tauri::command]
async fn search_notes(query: String) -> Result<Vec<Note>, String> {
    // Your search logic here
    Ok(found_notes)
}

// Add to invoke_handler
.invoke_handler(tauri::generate_handler![
    get_notes,
    save_note,
    delete_note,
    get_notes_directory,
    search_notes  // Add new command
])
```

### Step 2: Call from Frontend

```javascript
// In app.js
async function searchNotes(query) {
    if (window.__TAURI__) {
        const results = await window.__TAURI__.invoke('search_notes', { 
            query: query 
        });
        return results;
    }
    return [];
}
```

### Step 3: Update UI

```javascript
// Add search input to HTML
// Add event listener
// Display results
```

## 🐛 Debugging

### Frontend Debugging
- Open browser developer tools when running in dev mode
- Check console for JavaScript errors
- Use `console.log()` extensively

### Backend Debugging
- Rust logs appear in the terminal
- Use `println!` for quick debugging
- Use `dbg!` macro for structured debugging

```rust
// Debugging in Rust
#[tauri::command]
async fn save_note(note: Note) -> Result<Note, String> {
    dbg!(&note); // Print the note structure
    // ... rest of function
}
```

## 📝 Code Style

### Rust
- Use `cargo fmt` for formatting
- Use `cargo clippy` for linting
- Follow idiomatic Rust patterns

### JavaScript
- Use camelCase for variables
- Use PascalCase for classes
- Add JSDoc comments for functions

## 🧪 Testing

### Rust Tests
```bash
cargo test
```

### Frontend Testing
Open http://localhost:1420 in browser and test manually.

## 📦 Building

```bash
# Development build
cargo tauri dev

# Production build
cargo tauri build

# Result: src-tauri/target/release/bundle/macos/NoteMaker.app
```

## 🚀 Performance Tips

1. **Rust**: Use `async` for file operations
2. **Frontend**: Debounce search input
3. **Memory**: Clean up event listeners
4. **Storage**: Use efficient JSON structures

## 🔧 Common Tasks

### Add a New Button
```html
<!-- In index.html -->
<button id="my-button">My Button</button>
```

```javascript
// In app.js constructor
this.myButton = document.getElementById('my-button');
this.myButton.addEventListener('click', () => this.myFunction());
```

### Add Keyboard Shortcut
```javascript
// In setupEventListeners()
document.addEventListener('keydown', (e) => {
    if (e.cmdKey && e.key === 's') {
        e.preventDefault();
        this.saveCurrentNote();
    }
});
```

### Change Styling
```css
/* In styles.css */
.my-button {
    background: #my-color;
    /* other styles */
}
```

---

**Happy coding! 🎉**
