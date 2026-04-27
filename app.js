class NoteMaker {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        await this.loadNotes();
        this.renderNotesList();
        
        // Create first note if none exist
        if (this.notes.length === 0) {
            this.createNewNote();
        }
    }

    setupElements() {
        this.editor = document.getElementById('editor');
        this.preview = document.getElementById('preview');
        this.notesList = document.getElementById('notes-list');
        this.searchInput = document.getElementById('search');
        this.newNoteBtn = document.getElementById('new-note');
        this.saveBtn = document.getElementById('save-note');
    }

    setupEventListeners() {
        this.editor.addEventListener('input', () => this.updatePreview());
        this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.saveBtn.addEventListener('click', () => this.saveCurrentNote());
        this.searchInput.addEventListener('input', () => this.filterNotes());
        
        // Auto-save every 2 seconds
        setInterval(() => this.autoSave(), 2000);
    }

    async loadNotes() {
        try {
            if (window.__TAURI__) {
                // Use Tauri backend
                this.notes = await window.__TAURI__.invoke('get_notes');
            } else {
                // Fallback to localStorage for web testing
                const savedNotes = localStorage.getItem('notemaker-notes');
                if (savedNotes) {
                    this.notes = JSON.parse(savedNotes);
                }
            }
        } catch (error) {
            console.error('Failed to load notes:', error);
            this.notes = [];
        }
    }

    async saveNotes() {
        // Individual notes are saved via saveNote function
        // This function is mainly for localStorage fallback
        if (!window.__TAURI__) {
            try {
                localStorage.setItem('notemaker-notes', JSON.stringify(this.notes));
            } catch (error) {
                console.error('Failed to save notes:', error);
            }
        }
    }

    createNewNote() {
        const note = {
            id: Date.now().toString(),
            title: 'New Note',
            content: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        this.notes.unshift(note);
        this.selectNote(note);
        this.renderNotesList();
        this.saveNotes();
    }

    selectNote(note) {
        this.currentNote = note;
        this.editor.value = note.content;
        this.updatePreview();
        
        // Update active state in UI
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-note-id="${note.id}"]`)?.classList.add('active');
    }

    async saveCurrentNote() {
        if (!this.currentNote) return;
        
        this.currentNote.content = this.editor.value;
        this.currentNote.updated_at = new Date().toISOString();
        
        // Update title from first line if empty
        if (!this.currentNote.title || this.currentNote.title === 'New Note') {
            const firstLine = this.currentNote.content.split('\n')[0];
            if (firstLine.trim()) {
                this.currentNote.title = firstLine.replace(/^#+\s*/, '').substring(0, 50);
            }
        }
        
        try {
            if (window.__TAURI__) {
                // Use Tauri backend
                const updatedNote = await window.__TAURI__.invoke('save_note', { note: this.currentNote });
                this.currentNote = updatedNote;
                
                // Update note in array
                const index = this.notes.findIndex(n => n.id === updatedNote.id);
                if (index !== -1) {
                    this.notes[index] = updatedNote;
                }
            } else {
                // Fallback to localStorage
                await this.saveNotes();
            }
            
            this.renderNotesList();
        } catch (error) {
            console.error('Failed to save note:', error);
        }
    }

    async autoSave() {
        if (this.currentNote && this.editor.value !== this.currentNote.content) {
            await this.saveCurrentNote();
        }
    }

    async deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            try {
                if (window.__TAURI__) {
                    await window.__TAURI__.invoke('delete_note', { noteId });
                }
                
                this.notes = this.notes.filter(note => note.id !== noteId);
                
                if (this.currentNote?.id === noteId) {
                    this.currentNote = null;
                    this.editor.value = '';
                    this.preview.innerHTML = '';
                }
                
                await this.saveNotes();
                this.renderNotesList();
            } catch (error) {
                console.error('Failed to delete note:', error);
            }
        }
    }

    filterNotes() {
        const query = this.searchInput.value.toLowerCase();
        const filteredNotes = query 
            ? this.notes.filter(note => 
                note.title.toLowerCase().includes(query) || 
                note.content.toLowerCase().includes(query)
              )
            : this.notes;
        
        this.renderNotesList(filteredNotes);
    }

    renderNotesList(notesToRender = this.notes) {
        this.notesList.innerHTML = '';
        
        notesToRender.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';
            noteElement.dataset.noteId = note.id;
            
            const title = document.createElement('div');
            title.textContent = note.title;
            title.style.fontWeight = 'bold';
            
            const date = document.createElement('div');
            date.textContent = new Date(note.updated_at).toLocaleDateString();
            date.style.fontSize = '0.8rem';
            date.style.color = '#6c757d';
            
            noteElement.appendChild(title);
            noteElement.appendChild(date);
            
            noteElement.addEventListener('click', () => this.selectNote(note));
            
            // Right-click to delete
            noteElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.deleteNote(note.id);
            });
            
            this.notesList.appendChild(noteElement);
        });
    }

    updatePreview() {
        const markdown = this.editor.value;
        const html = marked.parse(markdown);
        this.preview.innerHTML = html;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NoteMaker();
});
