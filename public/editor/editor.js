class PlayerEditor {
    constructor() {
        this.editor = null;
        this.currentFile = null;
        this.currentContent = '';
        this.isModified = false;
        this.files = [];

        this.fileList = document.getElementById('file-list');
        this.currentFileName = document.getElementById('current-file-name');
        this.saveBtn = document.getElementById('save-btn');

        this.initMonaco();
        this.loadFiles();
        this.setupEventListeners();
    }

    initMonaco() {
        require.config({ 
            paths: { 
                'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
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
                if (this.currentFile && !this.isModified) {
                    this.markAsModified();
                }
            });
        });
    }

    setupEventListeners() {
        this.saveBtn.addEventListener('click', () => {
            this.saveCurrentFile();
        });

        // Keyboard shortcut for save (Ctrl+S / Cmd+S)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (this.currentFile && this.isModified) {
                    this.saveCurrentFile();
                }
            }
        });
    }

    async loadFiles() {
        try {
            const response = await fetch('/api/player-files');
            if (!response.ok) {
                throw new Error('Failed to load files');
            }
            
            this.files = await response.json();
            this.renderFileList();
        } catch (error) {
            console.error('Error loading files:', error);
            this.fileList.innerHTML = '<div class="error">Failed to load files</div>';
        }
    }

    renderFileList() {
        if (this.files.length === 0) {
            this.fileList.innerHTML = '<div class="loading">No files found</div>';
            return;
        }

        this.fileList.innerHTML = '';
        this.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            // Add extension class for icon
            const ext = file.split('.').pop();
            fileItem.classList.add(ext);
            
            fileItem.textContent = file;
            fileItem.addEventListener('click', () => {
                this.openFile(file);
            });
            
            this.fileList.appendChild(fileItem);
        });
    }

    async openFile(filename) {
        // Check if there are unsaved changes
        if (this.isModified) {
            const confirmDiscard = confirm(
                `You have unsaved changes in ${this.currentFile}. Do you want to discard them?`
            );
            if (!confirmDiscard) {
                return;
            }
        }

        try {
            const response = await fetch(`/api/player-files/${encodeURIComponent(filename)}`);
            if (!response.ok) {
                throw new Error('Failed to load file');
            }

            const data = await response.json();
            this.currentFile = filename;
            this.currentContent = data.content;
            
            // Update editor
            this.editor.setValue(data.content);
            this.editor.updateOptions({ readOnly: false });
            
            // Set language based on file extension
            const ext = filename.split('.').pop();
            const languageMap = {
                'js': 'javascript',
                'html': 'html',
                'css': 'css',
                'json': 'json'
            };
            const language = languageMap[ext] || 'plaintext';
            monaco.editor.setModelLanguage(this.editor.getModel(), language);
            
            // Update UI
            this.currentFileName.textContent = filename;
            this.markAsSaved();
            
            // Update active file in list
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('active');
                if (item.textContent === filename) {
                    item.classList.add('active');
                }
            });
        } catch (error) {
            console.error('Error opening file:', error);
            alert(`Failed to open file: ${filename}`);
        }
    }

    async saveCurrentFile() {
        if (!this.currentFile) {
            return;
        }

        const content = this.editor.getValue();
        
        // Update button state
        this.saveBtn.textContent = 'Saving...';
        this.saveBtn.classList.add('saving');
        this.saveBtn.disabled = true;

        try {
            const response = await fetch(`/api/player-files/${encodeURIComponent(this.currentFile)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error('Failed to save file');
            }

            this.currentContent = content;
            this.markAsSaved();
            
            // Show success state briefly
            this.saveBtn.textContent = '✓ Saved';
            this.saveBtn.classList.remove('saving');
            this.saveBtn.classList.add('saved');
            
            setTimeout(() => {
                this.saveBtn.textContent = 'Save';
                this.saveBtn.classList.remove('saved');
            }, 2000);

            // Refresh the preview
            this.refreshPreview();
        } catch (error) {
            console.error('Error saving file:', error);
            alert(`Failed to save file: ${this.currentFile}`);
            this.saveBtn.textContent = 'Save';
            this.saveBtn.classList.remove('saving');
            this.saveBtn.disabled = false;
        }
    }

    markAsModified() {
        this.isModified = true;
        this.saveBtn.disabled = false;
        this.saveBtn.classList.add('modified');
        this.currentFileName.textContent = `${this.currentFile} • Modified`;
    }

    markAsSaved() {
        this.isModified = false;
        this.saveBtn.disabled = true;
        this.saveBtn.classList.remove('modified');
        if (this.currentFile) {
            this.currentFileName.textContent = this.currentFile;
        }
    }

    refreshPreview() {
        const preview = document.getElementById('player-preview');
        preview.src = preview.src; // Force reload
    }
}

// Initialize editor when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.playerEditor = new PlayerEditor();
});

