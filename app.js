// Helper to get Tauri invoke function (v2 API path)
function getTauriInvoke() {
    return window.__TAURI__?.core?.invoke;
}

// Helper for Tauri dialogs (falls back to browser dialogs)
async function tauriMessage(msg) {
    if (window.__TAURI__?.dialog?.message) {
        await window.__TAURI__.dialog.message(msg);
    } else {
        alert(msg);
    }
}

async function tauriAsk(msg) {
    if (window.__TAURI__?.dialog?.ask) {
        return await window.__TAURI__.dialog.ask(msg, { kind: 'warning' });
    }
    return confirm(msg);
}

async function tauriOpenDirectory() {
    if (window.__TAURI__?.dialog?.open) {
        return await window.__TAURI__.dialog.open({ directory: true, multiple: false });
    }
    return null;
}

// Custom text input modal (replacement for prompt() which is blocked in WKWebView)
function tauriPrompt(message, placeholder = '') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:var(--color-background,#ffffff);border:1px solid var(--color-border,#e2e8f0);border-radius:8px;padding:1.5rem;min-width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.2);';

        const label = document.createElement('div');
        label.textContent = message;
        label.style.cssText = 'margin-bottom:0.75rem;color:var(--color-text,#1e293b);font-size:0.95rem;';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder;
        input.style.cssText = 'width:100%;padding:0.5rem;border:1px solid var(--color-border,#e2e8f0);border-radius:4px;background:var(--color-surface,#f8fafc);color:var(--color-text,#1e293b);font-size:0.9rem;box-sizing:border-box;outline:none;';

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'padding:0.4rem 1rem;border:1px solid var(--color-border,#e2e8f0);border-radius:4px;background:transparent;color:var(--color-text,#1e293b);cursor:pointer;';

        const okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        okBtn.style.cssText = 'padding:0.4rem 1rem;border:none;border-radius:4px;background:var(--color-primary,#2563eb);color:#ffffff;cursor:pointer;font-weight:600;';

        function close(value) {
            overlay.remove();
            resolve(value);
        }

        cancelBtn.addEventListener('click', () => close(null));
        okBtn.addEventListener('click', () => close(input.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') close(input.value);
            if (e.key === 'Escape') close(null);
        });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(okBtn);
        dialog.appendChild(label);
        dialog.appendChild(input);
        dialog.appendChild(btnRow);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        input.focus();
    });
}

// ===== Context Menu =====
function showContextMenu(e, items) {
    // Remove any existing context menu
    document.querySelectorAll('.context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'context-menu';

    items.forEach(item => {
        if (item.separator) {
            const sep = document.createElement('div');
            sep.className = 'context-menu-separator';
            menu.appendChild(sep);
            return;
        }

        const el = document.createElement('div');
        el.className = 'context-menu-item' + (item.danger ? ' danger' : '');

        const icon = document.createElement('span');
        icon.className = 'context-menu-item-icon';
        icon.innerHTML = item.icon || '';

        const label = document.createElement('span');
        label.textContent = item.label;

        el.appendChild(icon);
        el.appendChild(label);
        el.addEventListener('click', () => {
            menu.remove();
            item.action();
        });
        menu.appendChild(el);
    });

    document.body.appendChild(menu);

    // Position: ensure menu stays within viewport
    const rect = menu.getBoundingClientRect();
    let x = e.clientX;
    let y = e.clientY;
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 8;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    // Close on click outside or Escape
    const close = (ev) => {
        if (!menu.contains(ev.target)) {
            menu.remove();
            document.removeEventListener('click', close);
            document.removeEventListener('contextmenu', close);
        }
    };
    const closeEsc = (ev) => {
        if (ev.key === 'Escape') {
            menu.remove();
            document.removeEventListener('keydown', closeEsc);
        }
    };
    // Delay so this click doesn't close it immediately
    setTimeout(() => {
        document.addEventListener('click', close);
        document.addEventListener('contextmenu', close);
        document.addEventListener('keydown', closeEsc);
    }, 0);
}

// SVG icon helpers
const ICONS = {
    rename: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
    duplicate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
};

class NoteMaker {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.currentDir = '';       // absolute path of currently browsed directory
        this.dirListing = null;     // current directory listing from backend
        this.notesDirectory = '';   // root notes directory
        this.isSaving = false;
        this.lastSaveTime = null;
        this.init();
    }

    async init() {
        console.log('NoteMaker initializing...');
        this.setupElements();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        await this.loadNotesDirectory();
        this.currentDir = this.notesDirectory;
        await this.browseDirectory(this.currentDir);
        await this.loadNotesForDir();
        this.renderNotesList();
        this.updateStatusBar();
        console.log('NoteMaker initialized successfully');

        if (this.notes.length === 0) {
            this.createNewNote();
        }
    }

    setupElements() {
        this.editor = document.getElementById('editor');
        this.preview = document.getElementById('preview');
        this.notesList = document.getElementById('notes-list');
        this.foldersList = document.getElementById('folders-list');
        this.searchInput = document.getElementById('search');
        this.newNoteBtn = document.getElementById('new-note');
        this.newFolderBtn = document.getElementById('new-folder');
        this.saveBtn = document.getElementById('save-note');
        this.refreshFoldersBtn = document.getElementById('refresh-folders');
        this.navUpBtn = document.getElementById('nav-up');
        this.currentPathEl = document.getElementById('current-path');
        this.currentFolderSpan = document.getElementById('current-folder');
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

        this.newNoteBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.createNewNote();
        });

        this.newFolderBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.createNewFolder();
        });

        this.saveBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveCurrentNote();
        });

        this.refreshFoldersBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.browseDirectory(this.currentDir);
        });

        this.navUpBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.dirListing?.parent) {
                this.browseDirectory(this.dirListing.parent);
            }
        });

        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.filterNotes());
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.editor.focus();
            });
        }

        setInterval(() => this.autoSave(), 2000);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Cmd+N - New note
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                this.createNewNote();
            }
            
            // Cmd+Shift+N - New folder
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                this.createNewFolder();
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

    async loadNotesDirectory() {
        try {
            const invoke = getTauriInvoke();
            if (invoke) {
                this.notesDirectory = await invoke('get_notes_directory');
            } else {
                this.notesDirectory = '~/Documents/NoteMaker';
            }
        } catch (error) {
            console.error('Failed to load notes directory:', error);
            this.notesDirectory = '~/Documents/NoteMaker';
        }
    }

    async browseDirectory(dirPath) {
        try {
            const invoke = getTauriInvoke();
            if (!invoke) return;

            this.dirListing = await invoke('list_directory', { path: dirPath });
            this.currentDir = this.dirListing.path;
            this.renderBrowser();
            // Reload notes for the new directory
            await this.loadNotesForDir();
            this.renderNotesList();
        } catch (error) {
            console.error('Failed to browse directory:', error);
            await tauriMessage('Cannot access directory: ' + error);
        }
    }

    async loadNotesForDir() {
        this.notes = [];
        if (!this.dirListing) return;

        const invoke = getTauriInvoke();
        if (!invoke) return;

        // Compute a relative folder path from notesDirectory
        let relFolder = '';
        if (this.currentDir !== this.notesDirectory && this.currentDir.startsWith(this.notesDirectory)) {
            relFolder = this.currentDir.slice(this.notesDirectory.length + 1);
        }

        try {
            this.notes = await invoke('get_notes', { folder: relFolder || '' });
        } catch (error) {
            console.error('Failed to load notes:', error);
            this.notes = [];
        }
    }

    renderBrowser() {
        this.foldersList.innerHTML = '';

        // Update path display
        if (this.currentPathEl) {
            // Show a shortened path
            const home = this.notesDirectory;
            let display = this.currentDir;
            if (display.startsWith(home)) {
                display = '~' + display.slice(home.length);
            }
            this.currentPathEl.textContent = display || '/';
            this.currentPathEl.title = this.currentDir;
        }

        if (this.currentFolderSpan) {
            const dirName = this.currentDir.split('/').pop() || 'Root';
            this.currentFolderSpan.textContent = dirName;
        }

        // Disable up button at filesystem root
        if (this.navUpBtn) {
            this.navUpBtn.disabled = !this.dirListing?.parent;
            this.navUpBtn.style.opacity = this.dirListing?.parent ? '1' : '0.3';
        }

        if (!this.dirListing) return;

        for (const entry of this.dirListing.entries) {
            if (!entry.is_dir) continue; // Only show directories in the browser

            const item = document.createElement('div');
            item.className = 'browser-item';

            const icon = document.createElement('span');
            icon.className = 'browser-item-icon';
            icon.textContent = '📁';

            const name = document.createElement('span');
            name.className = 'browser-item-name';
            name.textContent = entry.name;

            item.appendChild(icon);
            item.appendChild(name);

            item.addEventListener('click', () => this.browseDirectory(entry.path));

            // Right-click context menu for directories
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showContextMenu(e, [
                    { icon: ICONS.rename, label: 'Rename', action: () => this.renameDirectory(entry.path, entry.name) },
                    { separator: true },
                    { icon: ICONS.delete, label: 'Delete', danger: true, action: () => this.deleteDirectory(entry.path, entry.name) },
                ]);
            });

            this.foldersList.appendChild(item);
        }

        if (this.dirListing.entries.filter(e => e.is_dir).length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'font-size:0.75rem;color:var(--color-text-muted);padding:var(--spacing-sm);';
            empty.textContent = 'No subfolders';
            this.foldersList.appendChild(empty);
        }
    }

    async createNewFolder() {
        const folderName = await tauriPrompt('Enter folder name:', 'My Folder');
        if (!folderName || !folderName.trim()) return;

        try {
            const invoke = getTauriInvoke();
            if (invoke) {
                // Create the folder as an absolute path inside currentDir
                const fullPath = this.currentDir + '/' + folderName.trim();
                await invoke('create_folder', { path: this.getRelativePath(fullPath) });
                await this.browseDirectory(this.currentDir);
                await tauriMessage(`Folder "${folderName.trim()}" created!`);
            }
        } catch (error) {
            console.error('Failed to create folder:', error);
            await tauriMessage('Failed to create folder: ' + error);
        }
    }

    // Get path relative to notesDirectory for backend commands that expect it
    getRelativePath(absPath) {
        if (absPath.startsWith(this.notesDirectory + '/')) {
            return absPath.slice(this.notesDirectory.length + 1);
        }
        if (absPath === this.notesDirectory) return '';
        return absPath;
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

    createNewNote() {
        const note = {
            id: Date.now().toString(),
            title: 'New Note',
            content: '',
            folder: this.getRelativePath(this.currentDir) || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        this.notes.unshift(note);
        this.selectNoteWithAnimation(note);
        this.renderNotesList();
        
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
            const invoke = getTauriInvoke();
            if (invoke) {
                // Use Tauri backend
                const updatedNote = await invoke('save_note', { note: this.currentNote });
                this.currentNote = updatedNote;

                // Update note in array
                const index = this.notes.findIndex(n => n.id === updatedNote.id);
                if (index !== -1) {
                    this.notes[index] = updatedNote;
                }
            } else {
                // Fallback to localStorage
                const savedNotes = localStorage.getItem('notemaker-notes');
                let notes = savedNotes ? JSON.parse(savedNotes) : [];
                const index = notes.findIndex(n => n.id === this.currentNote.id);
                if (index !== -1) {
                    notes[index] = this.currentNote;
                } else {
                    notes.push(this.currentNote);
                }
                localStorage.setItem('notemaker-notes', JSON.stringify(notes));
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
        console.log('deleteNote() called with noteId:', noteId);

        const confirmed = await tauriAsk('Are you sure you want to delete this note?');
        if (confirmed) {
            console.log('User confirmed deletion');

            try {
                // Add fade animation
                const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
                if (noteElement) {
                    noteElement.style.opacity = '0';
                    noteElement.style.transform = 'translateX(-10px)';
                }

                const invoke = getTauriInvoke();
                if (invoke) {
                    console.log('Using Tauri backend to delete note');
                    await invoke('delete_note', { noteId });
                    console.log('Note deleted successfully via Tauri');
                }

                this.notes = this.notes.filter(note => note.id !== noteId);

                if (this.currentNote?.id === noteId) {
                    this.currentNote = null;
                    this.editor.value = '';
                    this.preview.innerHTML = '';
                    this.updateStatusBar();
                }

                // Re-render after animation
                setTimeout(() => {
                    this.renderNotesList();
                    this.browseDirectory(this.currentDir);
                }, 150);

            } catch (error) {
                console.error('Failed to delete note:', error);
                await tauriMessage('Failed to delete note: ' + error);

                const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
                if (noteElement) {
                    noteElement.style.opacity = '1';
                    noteElement.style.transform = 'translateX(0)';
                }
            }
        }
    }

    async renameNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        const newTitle = await tauriPrompt('Rename note:', note.title);
        if (!newTitle || !newTitle.trim() || newTitle.trim() === note.title) return;

        try {
            const invoke = getTauriInvoke();
            if (invoke) {
                const updated = await invoke('rename_note', { noteId, newTitle: newTitle.trim() });
                note.title = updated.title;
                note.updated_at = updated.updated_at;
            } else {
                note.title = newTitle.trim();
            }
            if (this.currentNote?.id === noteId) {
                this.currentNote.title = note.title;
            }
            this.renderNotesList();
        } catch (error) {
            console.error('Failed to rename note:', error);
            await tauriMessage('Failed to rename note: ' + error);
        }
    }

    async duplicateNote(noteId) {
        try {
            const invoke = getTauriInvoke();
            if (invoke) {
                const newNote = await invoke('duplicate_note', { noteId });
                this.notes.unshift(newNote);
            } else {
                const original = this.notes.find(n => n.id === noteId);
                if (!original) return;
                const dup = { ...original, id: Date.now().toString(), title: original.title + ' (copy)', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                this.notes.unshift(dup);
            }
            this.renderNotesList();
            this.browseDirectory(this.currentDir);
        } catch (error) {
            console.error('Failed to duplicate note:', error);
            await tauriMessage('Failed to duplicate note: ' + error);
        }
    }

    async renameDirectory(dirPath, dirName) {
        const newName = await tauriPrompt('Rename folder:', dirName);
        if (!newName || !newName.trim() || newName.trim() === dirName) return;

        try {
            const invoke = getTauriInvoke();
            if (invoke) {
                await invoke('rename_directory', { path: dirPath, newName: newName.trim() });
            }
            this.browseDirectory(this.currentDir);
        } catch (error) {
            console.error('Failed to rename directory:', error);
            await tauriMessage('Failed to rename folder: ' + error);
        }
    }

    async deleteDirectory(dirPath, dirName) {
        const confirmed = await tauriAsk(`Delete folder "${dirName}" and all its contents?`);
        if (!confirmed) return;

        try {
            const invoke = getTauriInvoke();
            if (invoke) {
                await invoke('delete_directory', { path: dirPath });
            }
            this.browseDirectory(this.currentDir);
        } catch (error) {
            console.error('Failed to delete directory:', error);
            await tauriMessage('Failed to delete folder: ' + error);
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
            
            const titleDiv = document.createElement('div');
            titleDiv.style.flex = '1';
            titleDiv.textContent = note.title;
            
            const dateDiv = document.createElement('div');
            dateDiv.style.fontSize = '0.75rem';
            dateDiv.style.color = 'var(--color-text-muted)';
            dateDiv.textContent = this.formatDate(note.updated_at);
            
            noteElement.appendChild(titleDiv);
            noteElement.appendChild(dateDiv);

            noteElement.addEventListener('click', () => this.selectNoteWithAnimation(note));

            // Right-click context menu
            noteElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showContextMenu(e, [
                    { icon: ICONS.rename, label: 'Rename', action: () => this.renameNote(note.id) },
                    { icon: ICONS.duplicate, label: 'Duplicate', action: () => this.duplicateNote(note.id) },
                    { separator: true },
                    { icon: ICONS.delete, label: 'Delete', danger: true, action: () => this.deleteNote(note.id) },
                ]);
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
    console.log('DOM loaded, initializing app...');
    
    // Store global reference for potential re-initialization
    window.noteMakerApp = new NoteMaker();
    
    // Check if Tauri API is available after initialization
    setTimeout(() => {
        console.log('Checking Tauri API availability after app init...');
        console.log('window.__TAURI__ exists:', !!window.__TAURI__);
        if (!window.__TAURI__) {
            console.warn('Tauri API still not available after app initialization');
        }
    }, 1000);
});
