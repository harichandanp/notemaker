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
        this.activeTagFilter = null;
        this.init();
    }

    async init() {
        console.log('NoteMaker initializing...');
        this.setupElements();
        this.configureMarked();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        await this.loadNotesDirectory();
        this.currentDir = this.notesDirectory;
        await this.browseDirectory(this.currentDir);
        await this.loadNotesForDir();
        this.renderNotesList();
        this.renderTagsPanel();
        this.updateStatusBar();
        console.log('NoteMaker initialized successfully');

        if (this.notes.length === 0) {
            this.createNewNote();
        }
    }

    configureMarked() {
        const renderer = new marked.Renderer();

        // Syntax highlighting for code blocks
        renderer.code = (code, lang) => {
            const language = (typeof hljs !== 'undefined' && hljs.getLanguage(lang)) ? lang : 'plaintext';
            const highlighted = typeof hljs !== 'undefined'
                ? hljs.highlight(code, { language }).value
                : code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
        };

        // Task list items with stable indexes for interactive checkboxes
        let checkboxIndex = 0;
        renderer.listitem = (text, task, checked) => {
            if (task) {
                const idx = checkboxIndex++;
                return `<li class="task-item"><input type="checkbox" class="task-checkbox" data-idx="${idx}" ${checked ? 'checked' : ''}>${text}</li>`;
            }
            return `<li>${text}</li>`;
        };

        // Headings with IDs for outline scroll targets
        renderer.heading = (text, level) => {
            const slug = text.toLowerCase().replace(/[^\w]+/g, '-');
            return `<h${level} id="h-${slug}">${text}</h${level}>`;
        };

        marked.use({ renderer });
        // Expose a reset function to zero out the checkbox counter before each render
        this._resetCheckboxIndex = () => { checkboxIndex = 0; };
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
        this.tagBar = document.getElementById('tag-bar');
        this.tagChips = document.getElementById('tag-chips');
        this.tagInput = document.getElementById('tag-input');
        this.tagsSection = document.getElementById('tags-section');
        this.tagsFilterList = document.getElementById('tags-filter-list');
        this.clearTagFilterBtn = document.getElementById('clear-tag-filter');
        this.backlinksSection = document.getElementById('backlinks-section');
        this.backlinksList = document.getElementById('backlinks-list');
        this.outlinePanel = document.getElementById('outline-panel');
        this.outlineList = document.getElementById('outline-list');
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

        if (this.tagInput) {
            this.tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const val = this.tagInput.value.trim().replace(/,/g, '');
                    if (val) this.addTag(val);
                }
                if (e.key === 'Backspace' && !this.tagInput.value && this.currentNote?.tags?.length) {
                    this.removeTag(this.currentNote.tags[this.currentNote.tags.length - 1]);
                }
            });
            this.tagInput.addEventListener('blur', () => {
                const val = this.tagInput.value.trim().replace(/,/g, '');
                if (val) this.addTag(val);
            });
        }

        if (this.clearTagFilterBtn) {
            this.clearTagFilterBtn.addEventListener('click', () => {
                this.activeTagFilter = null;
                this.renderTagsPanel();
                this.filterNotes();
            });
        }

        // Event delegation for preview: wikilinks + interactive checkboxes
        this.preview.addEventListener('click', (e) => {
            if (e.target.classList.contains('wikilink')) {
                this.navigateToWikilink(e.target.dataset.target);
            }
            if (e.target.classList.contains('task-checkbox')) {
                this.toggleCheckbox(parseInt(e.target.dataset.idx, 10));
            }
        });

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
        this.activeTagFilter = null;
        this.renderTagsPanel();
        if (this.backlinksSection) this.backlinksSection.style.display = 'none';
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
            tags: [],
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
        this.updatePreview();  // also calls updateOutline + updateBacklinks
        this.updateStatusBar();
        this.setSaveStatus('saved');
        this.renderTagBar();

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
        let filtered = this.notes;

        if (this.activeTagFilter) {
            filtered = filtered.filter(note => note.tags?.includes(this.activeTagFilter));
        }

        if (query) {
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query) ||
                note.tags?.some(t => t.toLowerCase().includes(query))
            );
        }

        this.renderNotesList(filtered);
    }

    renderNotesList(notesToRender = this.notes) {
        this.notesList.innerHTML = '';

        notesToRender.forEach((note, index) => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';
            noteElement.dataset.noteId = note.id;
            noteElement.style.animationDelay = `${index * 50}ms`;

            // Top row: title + date
            const topRow = document.createElement('div');
            topRow.className = 'note-item-top';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'note-item-title';
            titleDiv.textContent = note.title;

            const dateDiv = document.createElement('div');
            dateDiv.className = 'note-item-date';
            dateDiv.textContent = this.formatDate(note.updated_at);

            topRow.appendChild(titleDiv);
            topRow.appendChild(dateDiv);
            noteElement.appendChild(topRow);

            // Tags row (only if note has tags)
            if (note.tags?.length) {
                const tagsRow = document.createElement('div');
                tagsRow.className = 'note-item-tags';
                note.tags.forEach(tag => {
                    const chip = document.createElement('span');
                    chip.className = 'note-tag-chip';
                    chip.textContent = tag;
                    tagsRow.appendChild(chip);
                });
                noteElement.appendChild(tagsRow);
            }

            noteElement.addEventListener('click', () => this.selectNoteWithAnimation(note));

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
        this._resetCheckboxIndex?.();
        const html = marked.parse(this.editor.value);
        // Post-process: convert [[Note Title]] and [[Title|Alias]] to wikilink spans
        const processed = html.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, target, alias) => {
            const display = alias ? alias : target;
            const exists = this.notes.some(n => n.title.toLowerCase() === target.trim().toLowerCase());
            const cls = exists ? 'wikilink' : 'wikilink wikilink-missing';
            return `<span class="${cls}" data-target="${target.trim()}">${display}</span>`;
        });
        this.preview.innerHTML = processed;
        this.updateOutline();
        this.updateBacklinks();
    }

    updateOutline() {
        if (!this.outlinePanel || !this.outlineList) return;
        const headings = [...this.preview.querySelectorAll('h1,h2,h3,h4,h5,h6')];
        if (headings.length < 2) {
            this.outlinePanel.style.display = 'none';
            return;
        }
        this.outlinePanel.style.display = '';
        this.outlineList.innerHTML = '';
        headings.forEach(h => {
            const level = parseInt(h.tagName[1], 10);
            const el = document.createElement('div');
            el.className = `outline-item outline-h${level}`;
            el.textContent = h.textContent;
            el.title = h.textContent;
            el.addEventListener('click', () => h.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            this.outlineList.appendChild(el);
        });
    }

    updateBacklinks() {
        if (!this.backlinksSection || !this.backlinksList || !this.currentNote) return;
        const title = this.currentNote.title;
        const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\[\\[${escaped}(?:\\|[^\\]]+)?\\]\\]`, 'i');
        const linkers = this.notes.filter(n => n.id !== this.currentNote.id && pattern.test(n.content));
        if (linkers.length === 0) {
            this.backlinksSection.style.display = 'none';
            return;
        }
        this.backlinksSection.style.display = '';
        this.backlinksList.innerHTML = '';
        linkers.forEach(n => {
            const el = document.createElement('div');
            el.className = 'backlink-item';
            el.textContent = n.title;
            el.addEventListener('click', () => this.selectNoteWithAnimation(n));
            this.backlinksList.appendChild(el);
        });
    }

    toggleCheckbox(idx) {
        let count = 0;
        const updated = this.editor.value.replace(/^(\s*[-*+] )\[([ x])\]/gm, (match, prefix, state) => {
            if (count++ === idx) {
                return `${prefix}[${state === ' ' ? 'x' : ' '}]`;
            }
            return match;
        });
        if (updated !== this.editor.value) {
            this.editor.value = updated;
            this.updatePreview();
            this.updateStatusBar();
            this.setSaveStatus('unsaved');
            this.autoSave();
        }
    }

    async navigateToWikilink(title) {
        const note = this.notes.find(n => n.title.toLowerCase() === title.toLowerCase());
        if (note) {
            this.selectNoteWithAnimation(note);
        } else {
            const create = await tauriAsk(`"${title}" doesn't exist yet. Create it?`);
            if (create) {
                this.createNewNote();
                await new Promise(r => setTimeout(r, 200)); // wait for animation
                this.editor.value = `# ${title}\n\n`;
                if (this.currentNote) this.currentNote.title = title;
                this.updatePreview();
                this.updateStatusBar();
                await this.saveCurrentNote();
                this.renderNotesList();
            }
        }
    }

    // ===== Tags =====

    collectAllTags() {
        const set = new Set();
        this.notes.forEach(note => note.tags?.forEach(t => set.add(t)));
        return [...set].sort();
    }

    renderTagBar() {
        if (!this.tagChips || !this.tagInput) return;
        this.tagChips.innerHTML = '';
        const tags = this.currentNote?.tags || [];
        tags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';

            const label = document.createElement('span');
            label.textContent = tag;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'tag-remove';
            removeBtn.innerHTML = '×';
            removeBtn.title = `Remove tag "${tag}"`;
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTag(tag);
            });

            chip.appendChild(label);
            chip.appendChild(removeBtn);
            this.tagChips.appendChild(chip);
        });
        this.tagInput.value = '';
        this.tagInput.disabled = !this.currentNote;
        this.tagInput.placeholder = this.currentNote ? 'Add tag…' : '';
    }

    renderTagsPanel() {
        if (!this.tagsFilterList || !this.tagsSection) return;
        const allTags = this.collectAllTags();

        if (allTags.length === 0) {
            this.tagsSection.style.display = 'none';
            return;
        }

        this.tagsSection.style.display = '';
        this.tagsFilterList.innerHTML = '';

        allTags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'tags-filter-chip' + (this.activeTagFilter === tag ? ' active' : '');
            chip.textContent = tag;
            chip.addEventListener('click', () => {
                this.activeTagFilter = this.activeTagFilter === tag ? null : tag;
                this.renderTagsPanel();
                this.filterNotes();
            });
            this.tagsFilterList.appendChild(chip);
        });

        if (this.clearTagFilterBtn) {
            this.clearTagFilterBtn.style.display = this.activeTagFilter ? '' : 'none';
        }
    }

    async addTag(tag) {
        if (!this.currentNote) return;
        const normalized = tag.trim().toLowerCase().replace(/\s+/g, '-');
        if (!normalized) return;
        if (!this.currentNote.tags) this.currentNote.tags = [];
        if (this.currentNote.tags.includes(normalized)) {
            this.tagInput.value = '';
            return;
        }
        this.currentNote.tags.push(normalized);
        this.tagInput.value = '';
        this.renderTagBar();
        await this.saveCurrentNote();
        this.renderTagsPanel();
    }

    async removeTag(tag) {
        if (!this.currentNote?.tags) return;
        this.currentNote.tags = this.currentNote.tags.filter(t => t !== tag);
        this.renderTagBar();
        await this.saveCurrentNote();
        this.renderTagsPanel();
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
