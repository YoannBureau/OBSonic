const BINARY_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico',
    'woff', 'woff2', 'ttf', 'eot', 'otf',
    'mp3', 'wav', 'ogg', 'm4a', 'flac',
    'mp4', 'webm', 'ogv', 'avi', 'mkv',
    'zip', 'tar', 'gz', 'rar', '7z',
    'pdf', 'exe', 'dll', 'so', 'dylib'
]);

class PlayerEditor {
    constructor() {
        this.editor = null;
        this.currentFile = null;

        /**
         * Per-file state map.
         * Key: filename (string)
         * Value: { originalContent: string, currentContent: string, isModified: boolean, isBinary: boolean }
         */
        this.fileStates = new Map();

        this.fileList = document.getElementById('file-list');
        this.currentFileName = document.getElementById('current-file-name');
        this.saveBtn = document.getElementById('save-btn');
        this.saveAllBtn = document.getElementById('save-all-btn');

        // Toast container — created once, appended to body
        this._toastContainer = document.createElement('div');
        this._toastContainer.className = 'toast-container';
        document.body.appendChild(this._toastContainer);

        // Suppress the content-change event while we're programmatically loading
        this._suppressChangeEvent = false;

        this.initMonaco();
        this.loadFiles();
        this.setupEventListeners();
        this.setupSocket();
    }

    initMonaco() {
        require.config({
            paths: {
                'vs': 'libs/monaco-editor/vs'
            }
        });

        require(['vs/editor/editor.main'], () => {
            this.editor = monaco.editor.create(document.getElementById('monaco-editor'), {
                value: '// Select a file to edit',
                language: 'javascript',
                theme: 'vs-dark',
                automaticLayout: true,
                fontSize: 14,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 4,
                readOnly: true
            });

            // Listen for content changes
            this.editor.onDidChangeModelContent(() => {
                if (this._suppressChangeEvent || !this.currentFile) return;

                const state = this.fileStates.get(this.currentFile);
                if (!state || state.isBinary) return;

                const currentContent = this.editor.getValue();
                state.currentContent = currentContent;

                const nowModified = currentContent !== state.originalContent;
                if (nowModified !== state.isModified) {
                    state.isModified = nowModified;
                    this._refreshFileItem(this.currentFile);
                    this._updateSaveBtnState();
                    this._updateSaveAllBtnState();
                }
            });
        });
    }

    setupEventListeners() {
        this.saveBtn.addEventListener('click', () => {
            this.saveCurrentFile();
        });

        this.saveAllBtn.addEventListener('click', () => {
            this.saveAllFiles();
        });

        // Keyboard shortcut: Ctrl+S / Cmd+S — save current file
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
                e.preventDefault();
                if (this.currentFile && this._isCurrentFileModified()) {
                    this.saveCurrentFile();
                }
            }
            // Ctrl+Shift+S — save all
            if ((e.ctrlKey || e.metaKey) && e.key === 'S' && e.shiftKey) {
                e.preventDefault();
                this.saveAllFiles();
            }
        });
    }

    setupSocket() {
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.socket.on('player-files-changed', () => {
                console.log('Player files changed on disk, reloading...');
                this.loadFiles();
            });
        }
    }

    async loadFiles() {
        try {
            const response = await fetch('/api/player-files');
            if (!response.ok) throw new Error('Failed to load files');

            const files = await response.json();

            // Clean up files no longer on disk
            for (const file of this.fileStates.keys()) {
                if (!files.includes(file)) {
                    this.fileStates.delete(file);
                }
            }

            // Initialize a state entry for each file
            files.forEach(file => {
                const ext = file.split('.').pop().toLowerCase();
                const isBinary = BINARY_EXTENSIONS.has(ext);
                if (!this.fileStates.has(file)) {
                    this.fileStates.set(file, {
                        originalContent: null,   // null = not yet loaded from server
                        currentContent: null,
                        isModified: false,
                        isBinary: isBinary
                    });
                }
            });

            // If the currently open file was deleted
            if (this.currentFile && !files.includes(this.currentFile)) {
                this.currentFile = null;
                this.editor.setValue('// The file was deleted or moved');
                this.editor.updateOptions({ readOnly: true });
                this._updateTitleBar();
                this.saveBtn.disabled = true;
                this._updateSaveAllBtnState();
            } else if (this.currentFile) {
                const state = this.fileStates.get(this.currentFile);
                if (state && !state.isModified && !state.isBinary) {
                    try {
                        const fileRes = await fetch(`/api/player-files/${encodeURIComponent(this.currentFile)}`);
                        if (fileRes.ok) {
                            const data = await fileRes.json();
                            if (state.originalContent !== data.content) {
                                state.originalContent = data.content;
                                state.currentContent = data.content;
                                this._loadContentIntoEditor(this.currentFile, data.content);
                            }
                        }
                    } catch (e) {
                        console.error('Error reloading active file content:', e);
                    }
                }
            }

            this.renderFileList(files);
        } catch (error) {
            console.error('Error loading files:', error);
            this.fileList.innerHTML = '<div class="error">Failed to load files</div>';
        }
    }

    renderFileList(files) {
        if (!files || files.length === 0) {
            this.fileList.innerHTML = '<div class="loading">No files found</div>';
            return;
        }

        this.fileList.innerHTML = '';
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.dataset.file = file;

            // Extension-based icon class
            const ext = file.split('.').pop().toLowerCase();
            fileItem.classList.add(ext);

            fileItem.addEventListener('click', () => this.openFile(file));
            this.fileList.appendChild(fileItem);

            // Apply current state (may already have unsaved changes)
            this._refreshFileItem(file);
        });
    }

    /**
     * Rebuild the visual content of a single file item in the list
     * (name + dirty dot) without re-rendering the whole list.
     */
    _refreshFileItem(filename) {
        const item = this.fileList.querySelector(`[data-file="${CSS.escape(filename)}"]`);
        if (!item) return;

        const state = this.fileStates.get(filename);
        const isDirty = state && state.isModified;

        item.classList.toggle('active', filename === this.currentFile);
        item.classList.toggle('modified', isDirty);

        // Build label: dot indicator + filename
        const dot = isDirty ? '<span class="dirty-dot" title="Unsaved changes">●</span>' : '';
        item.innerHTML = `${dot}<span class="file-label">${filename}</span>`;
    }

    _loadBinaryMessage(filename) {
        this._suppressChangeEvent = true;
        this.currentFile = filename;
        const ext = filename.split('.').pop().toUpperCase();
        this.editor.setValue(`/*\n * Binary File: ${filename}\n *\n * Preview and editing of ${ext} files is not supported in the text editor.\n */`);
        this.editor.updateOptions({ readOnly: true });
        monaco.editor.setModelLanguage(this.editor.getModel(), 'plaintext');
        this._suppressChangeEvent = false;

        // Update UI
        this._updateTitleBar();
        this.saveBtn.disabled = true;
        this.saveBtn.classList.remove('modified', 'saved', 'saving');
        this._updateSaveAllBtnState();

        // Refresh all file items (active highlight + dirty dots)
        this.fileStates.forEach((_, fn) => this._refreshFileItem(fn));
    }

    async openFile(filename) {
        // Flush current editor content into fileStates before switching
        if (this.currentFile && this.editor) {
            const state = this.fileStates.get(this.currentFile);
            if (state && !state.isBinary) {
                state.currentContent = this.editor.getValue();
            }
        }

        const ext = filename.split('.').pop().toLowerCase();
        const isBinary = BINARY_EXTENSIONS.has(ext);

        if (isBinary) {
            this._loadBinaryMessage(filename);
            return;
        }

        // If the file was already loaded, restore from memory (preserves unsaved changes)
        const existingState = this.fileStates.get(filename);
        if (existingState && existingState.originalContent !== null) {
            this._loadContentIntoEditor(filename, existingState.currentContent);
            return;
        }

        // First time opening this file — fetch from server
        try {
            const response = await fetch(`/api/player-files/${encodeURIComponent(filename)}`);
            if (!response.ok) throw new Error('Failed to load file');

            const data = await response.json();

            // Initialise state
            this.fileStates.set(filename, {
                originalContent: data.content,
                currentContent: data.content,
                isModified: false,
                isBinary: false
            });

            this._loadContentIntoEditor(filename, data.content);
        } catch (error) {
            console.error('Error opening file:', error);
            alert(`Failed to open file: ${filename}`);
        }
    }

    /**
     * Put content into Monaco, set language, update header and list.
     * Does NOT trigger the dirty-check event (we suppress it).
     */
    _loadContentIntoEditor(filename, content) {
        this._suppressChangeEvent = true;

        this.currentFile = filename;

        this.editor.setValue(content);
        this.editor.updateOptions({ readOnly: false });

        const ext = filename.split('.').pop();
        const languageMap = { js: 'javascript', html: 'html', css: 'css', json: 'json' };
        monaco.editor.setModelLanguage(this.editor.getModel(), languageMap[ext] || 'plaintext');

        this._suppressChangeEvent = false;

        // Update UI
        this._updateTitleBar();
        this._updateSaveBtnState();
        this._updateSaveAllBtnState();

        // Refresh all file items (active highlight + dirty dots)
        this.fileStates.forEach((_, fn) => this._refreshFileItem(fn));
    }

    // ── Save current file ─────────────────────────────────────────────────────

    async saveCurrentFile() {
        if (!this.currentFile) return;

        // Flush editor value to state map first
        const state = this.fileStates.get(this.currentFile);
        if (!state || state.isBinary) return;

        state.currentContent = this.editor.getValue();
        await this._saveFile(this.currentFile, state.currentContent);
    }

    // ── Save all modified files ───────────────────────────────────────────────

    async saveAllFiles() {
        const dirty = [...this.fileStates.entries()].filter(([, s]) => s.isModified && s.originalContent !== null && !s.isBinary);
        if (dirty.length === 0) return;

        // Flush current editor content before saving
        if (this.currentFile) {
            const state = this.fileStates.get(this.currentFile);
            if (state && !state.isBinary) state.currentContent = this.editor.getValue();
        }

        this.saveAllBtn.disabled = true;

        const results = await Promise.allSettled(
            dirty.map(([filename, state]) => this._saveFile(filename, state.currentContent, { silent: true }))
        );

        const failed = results.filter(r => r.status === 'rejected');

        if (failed.length > 0) {
            this._showToast(`${failed.length} file(s) failed to save`, 'error');
        } else {
            this._showToast(`${dirty.length} file(s) saved`, 'success');
            // Refresh the preview once after all saves
            this.refreshPreview();
        }

        this._updateSaveAllBtnState();
    }

    /**
     * Core save logic, shared by saveCurrentFile and saveAllFiles.
     * @param {string} filename
     * @param {string} content
     * @param {{ silent?: boolean }} [opts]
     */
    async _saveFile(filename, content, opts = {}) {
        const isCurrent = filename === this.currentFile;

        if (isCurrent && !opts.silent) {
            this.saveBtn.classList.add('saving');
            this.saveBtn.disabled = true;
        }

        try {
            const response = await fetch(`/api/player-files/${encodeURIComponent(filename)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (!response.ok) throw new Error('Failed to save file');

            // Mark as saved
            const state = this.fileStates.get(filename);
            if (state) {
                state.originalContent = content;
                state.isModified = false;
            }

            this._refreshFileItem(filename);

            if (isCurrent) {
                this._updateTitleBar();
                this._updateSaveBtnState();
                this._updateSaveAllBtnState();

                if (!opts.silent) {
                    this.saveBtn.classList.remove('saving');
                    this._showToast(`${filename} saved`, 'success');
                    this.refreshPreview();
                }
            }

            console.log(`Saved: ${filename}`);
        } catch (error) {
            console.error(`Error saving ${filename}:`, error);

            if (isCurrent && !opts.silent) {
                this.saveBtn.classList.remove('saving');
                this.saveBtn.disabled = false;
                this._showToast(`Failed to save ${filename}`, 'error');
            }

            throw error;   // propagate so saveAllFiles can count failures
        }
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    _isCurrentFileModified() {
        if (!this.currentFile) return false;
        const state = this.fileStates.get(this.currentFile);
        return state ? state.isModified : false;
    }

    _hasAnyUnsavedChanges() {
        for (const state of this.fileStates.values()) {
            if (state.isModified) return true;
        }
        return false;
    }

    _updateTitleBar() {
        if (!this.currentFile) {
            this.currentFileName.textContent = 'No file selected';
            return;
        }
        const isDirty = this._isCurrentFileModified();
        this.currentFileName.textContent = isDirty
            ? `${this.currentFile} ●`
            : this.currentFile;
    }

    _updateSaveBtnState() {
        const isDirty = this._isCurrentFileModified();
        this.saveBtn.disabled = !isDirty;
        this.saveBtn.classList.toggle('modified', isDirty);
        if (!isDirty) {
            this.saveBtn.classList.remove('saved', 'saving');
        }
    }

    _updateSaveAllBtnState() {
        const hasAny = this._hasAnyUnsavedChanges();
        this.saveAllBtn.disabled = !hasAny;
        this.saveAllBtn.classList.toggle('has-changes', hasAny);
    }

    /**
     * Display a transient toast notification at the bottom-center of the editor.
     * @param {string} message
     * @param {'success'|'error'|'info'} [type='success']
     * @param {number} [duration=2500] ms before auto-dismiss
     */
    _showToast(message, type = 'success', duration = 2500) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        this._toastContainer.appendChild(toast);

        // Trigger enter animation on next frame
        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('toast-visible'));
        });

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            toast.classList.add('toast-hiding');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, duration);
    }

    refreshPreview() {
        const preview = document.getElementById('player-preview');
        preview.src = preview.src; // Force reload
    }
}

// Initialize editor when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Vertical split: top preview / bottom editor
    Split(['#preview-pane', '#editor-pane'], {
        direction: 'vertical',
        sizes: [50, 50],
        minSize: [100, 200],
        gutterSize: 5,
        cursor: 'row-resize',
        snapOffset: 0
    });

    // Horizontal split: left file browser / right code editor
    Split(['#file-browser-pane', '#code-editor-pane'], {
        direction: 'horizontal',
        sizes: [20, 80],
        minSize: [150, 400],
        gutterSize: 5,
        cursor: 'col-resize',
        snapOffset: 0
    });

    window.playerEditor = new PlayerEditor();
});
