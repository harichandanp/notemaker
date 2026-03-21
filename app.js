class NoteMaker {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.isSaving = false;
        this.lastSaveTime = null;
        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        await this.loadNotes();
        this.renderNotesList();
        this.updateStatusBar();
        
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
        this.wordCount = document.getElementById('word-count');
        this.charCount = document.getElementById('char-count');
        this.saveStatus = document.getElementById('save-status');
        this.saveText = document.getElementById('save-text');
    }

    setupEventListeners() {
        this.editor.addEventListener('input', () => {
            this.updatePreview();
            this.updateStatusBar();
            this.setSaveStatus('unsaved');
        });
        
        this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.saveBtn.addEventListener('click', () => this.saveCurrentNote());
        this.searchInput.addEventListener('input', () => this.filterNotes());
        
        // Auto-save every 2 seconds
        setInterval(() => this.autoSave(), 2000);
        
        // Focus search on Cmd+F
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.editor.focus();
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Cmd+N - New note
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                this.createNewNote();
            }
            
            // Cmd+S - Save note
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                this.saveCurrentNote();
            }
            
            // Cmd+F - Search
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                this.searchInput.focus();
                this.searchInput.select();
            }
            
            // Cmd+Shift+F - Clear search
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.searchInput.value = '';
                this.filterNotes();
                this.editor.focus();
            }
            
            // Escape - Focus editor
            if (e.key === 'Escape' && document.activeElement !== this.editor) {
                this.editor.focus();
            }
        });
    }

    updateStatusBar() {
        if (!this.currentNote) return;
        
        const text = this.editor.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        
        this.wordCount.textContent = words.toLocaleString();
        this.charCount.textContent = chars.toLocaleString();
    }

    setSaveStatus(status) {
        this.saveStatus.className = 'save-status';
        
        switch (status) {
            case 'saving':
                this.saveStatus.classList.add('saving');
                this.saveText.textContent = 'Saving...';
                break;
            case 'saved':
                this.saveStatus.classList.add('saved');
                this.saveText.textContent = 'Saved';
                this.lastSaveTime = new Date();
                break;
            case 'error':
                this.saveStatus.classList.add('error');
                this.saveText.textContent = 'Error';
                break;
            case 'unsaved':
                this.saveStatus.classList.add('saving');
                this.saveText.textContent = 'Unsaved';
                break;
        }
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
        this.selectNoteWithAnimation(note);
        this.renderNotesList();
        this.saveNotes();
        
        // Focus editor immediately
        setTimeout(() => this.editor.focus(), 100);
    }

    selectNote(note) {
        this.currentNote = note;
        this.editor.value = note.content;
        this.updatePreview();
        this.updateStatusBar();
        this.setSaveStatus('saved');
        
        // Update active state in UI
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-note-id="${note.id}"]`)?.classList.add('active');
    }

    selectNoteWithAnimation(note) {
        // Add fade animation
        const editorContainer = document.querySelector('.editor-container');
        editorContainer.style.opacity = '0';
        
        setTimeout(() => {
            this.selectNote(note);
            editorContainer.style.opacity = '1';
        }, 150);
    }

    async saveCurrentNote() {
        if (!this.currentNote || this.isSaving) return;
        
        this.isSaving = true;
        this.setSaveStatus('saving');
        
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
            this.setSaveStatus('saved');
        } catch (error) {
            console.error('Failed to save note:', error);
            this.setSaveStatus('error');
        } finally {
            this.isSaving = false;
        }
    }

    async autoSave() {
        if (this.currentNote && this.editor.value !== this.currentNote.content && !this.isSaving) {
            await this.saveCurrentNote();
        }
    }

    async deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            try {
                // Add fade animation
                const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
                if (noteElement) {
                    noteElement.style.opacity = '0';
                    noteElement.style.transform = 'translateX(-10px)';
                }
                
                if (window.__TAURI__) {
                    await window.__TAURI__.invoke('delete_note', { noteId });
                }
                
                this.notes = this.notes.filter(note => note.id !== noteId);
                
                if (this.currentNote?.id === noteId) {
                    this.currentNote = null;
                    this.editor.value = '';
                    this.preview.innerHTML = '';
                    this.updateStatusBar();
                }
                
                await this.saveNotes();
                
                // Re-render after animation
                setTimeout(() => this.renderNotesList(), 150);
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
        
        notesToRender.forEach((note, index) => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';
            noteElement.dataset.noteId = note.id;
            
            // Stagger animation
            noteElement.style.animationDelay = `${index * 50}ms`;
            
            const title = document.createElement('div');
            title.textContent = note.title;
            
            const date = document.createElement('div');
            date.textContent = this.formatDate(note.updated_at);
            
            noteElement.appendChild(title);
            noteElement.appendChild(date);
            
            noteElement.addEventListener('click', () => this.selectNoteWithAnimation(note));
            
            // Right-click to delete
            noteElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.deleteNote(note.id);
            });
            
            this.notesList.appendChild(noteElement);
        });
        
        // Re-select current note if it exists
        if (this.currentNote) {
            document.querySelector(`[data-note-id="${this.currentNote.id}"]`)?.classList.add('active');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
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
