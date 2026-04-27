# 📝 NoteMaker

A fast, private, native Mac notes app built with Rust + Tauri. Features a split-pane markdown editor with live preview, local file storage, and zero dependencies on cloud services.

## 🚀 Features

- **Split-pane markdown editor** with live preview
- **Local-first storage** - all notes saved as JSON files in `~/Documents/NoteMaker/`
- **Auto-save** every 2 seconds
- **Instant search** across all notes
- **Native Mac app** - fast startup, system integration
- **Privacy-focused** - no servers, no tracking, no cloud dependencies
- **Easy sync** - notes are just files, sync with any cloud service

## 🛠️ Tech Stack

- **Backend**: Rust + Tauri (native performance)
- **Frontend**: HTML + CSS + JavaScript (no heavy frameworks)
- **Storage**: Local file system (JSON files)
- **Markdown**: Marked.js for parsing

## 📋 Development Setup

### Prerequisites

1. **Rust** (latest stable)
2. **Xcode Command Line Tools** (for Mac development)
3. **Python 3** (for local dev server)

### Installation

```bash
# 1. Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# 2. Install Tauri CLI
cargo install tauri-cli

# 3. Clone/enter the project directory
cd /Users/hari/notemaker

# 4. Install frontend dependencies (none needed - using vanilla JS)
# The project uses Python's built-in HTTP server for development
```

### Development Workflow

```bash
# Start development mode (opens the app window)
cargo tauri dev

# Or test just the frontend in browser
python3 -m http.server 1420
# Then open http://localhost:1420
```

### Project Structure

```
notemaker/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── main.rs      # App entry point
│   │   └── lib.rs       # Main logic and Tauri commands
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri configuration
├── index.html           # Main HTML file
├── styles.css           # Styling
├── app.js               # Frontend JavaScript
├── package.json         # Frontend dev scripts
└── README.md            # This file
```

## 🔧 Development Commands

```bash
# Development
cargo tauri dev              # Run in development mode
npm run dev                  # Start frontend dev server only

# Building
cargo tauri build            # Build for production
npm run build                # Build frontend only

# Testing
cargo test                   # Run Rust tests
cargo clippy                 # Lint Rust code
```

## 📁 How Notes Are Stored

Notes are stored as individual JSON files in `~/Documents/NoteMaker/`:

```json
{
  "id": "1640995200000",
  "title": "My Note Title",
  "content": "# My Note\n\nThis is the markdown content...",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

This makes it easy to:
- **Backup**: Just copy the NoteMaker folder
- **Sync**: Use any cloud sync service (iCloud, Dropbox, etc.)
- **Export**: Files are already in a readable format
- **Version control**: Use Git if you want

## 🎨 Customization

### Adding New Features

1. **Backend (Rust)**: Add new commands in `src-tauri/src/lib.rs`
   ```rust
   #[tauri::command]
   async fn my_new_function(param: String) -> Result<String, String> {
       // Your logic here
       Ok("success".to_string())
   }
   
   // Add to invoke_handler:
   .invoke_handler(tauri::generate_handler![
       get_notes,
       save_note,
       delete_note,
       get_notes_directory,
       my_new_function  // Add here
   ])
   ```

2. **Frontend (JavaScript)**: Call from `app.js`
   ```javascript
   if (window.__TAURI__) {
       const result = await window.__TAURI__.invoke('my_new_function', { 
           param: 'hello' 
       });
   }
   ```

### Styling Changes

Edit `styles.css` - it uses standard CSS with flexbox for layout.

### UI Changes

Edit `index.html` and `app.js` - vanilla JavaScript with DOM manipulation.

## 🚀 Building for Distribution

```bash
# Build for production (creates .app bundle)
cargo tauri build

# The built app will be in:
# src-tauri/target/release/bundle/macos/NoteMaker.app
```

## 🐛 Troubleshooting

### Common Issues

1. **"cargo command not found"**
   ```bash
   source "$HOME/.cargo/env"
   ```

2. **Build fails with Tauri errors**
   ```bash
   cargo clean
   cargo tauri dev
   ```

3. **Frontend not loading**
   - Make sure Python 3 is installed
   - Check that port 1420 is not in use

4. **Notes not saving**
   - Check permissions on `~/Documents/NoteMaker/`
   - Ensure the directory exists

### Debug Mode

The app runs in debug mode by default. Check the terminal for Rust logs and browser console for JavaScript errors.

## 📝 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

1. Fork the project
2. Create a feature branch
3. Make your changes
4. Test with `cargo tauri dev`
5. Submit a pull request

## 🎯 Future Enhancements

- [ ] Tags and folders for organization
- [ ] Dark mode theme
- [ ] Export to PDF/HTML
- [ ] Keyboard shortcuts
- [ ] Split view for multiple notes
- [ ] Math equation support (KaTeX)
- [ ] Diagram support (Mermaid)

---

**Built with ❤️ using Rust + Tauri for fast, private, local-first note-taking.**
