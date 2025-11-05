class RemoteControl {
    constructor() {
        this.socket = io();
        this.playlistSelect = document.getElementById('playlist-select');
        this.connectionStatus = document.getElementById('connection-status');
        this.currentSongTitle = document.getElementById('current-song-title');
        this.currentSongArtist = document.getElementById('current-song-artist');
        this.playbackState = document.getElementById('playback-state');
        this.playerStatus = document.getElementById('player-status');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.playPauseIcon = document.getElementById('play-pause-icon');
        this.previousBtn = document.getElementById('previous-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.copyLinkBtn = document.getElementById('copy-link-btn');

        this.currentState = null;
        this.isConnected = false;

        this.initializeSocketListeners();
        this.initializeControls();
    }

    initializeSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.updateConnectionStatus();
        });

        this.socket.on('state-update', (state) => {
            console.log('State update received:', state);
            this.currentState = state;
            this.updateInterface(state);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showError(error);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.updateConnectionStatus();
        });

        this.socket.on('player-status', (status) => {
            console.log('Player status update:', status);
            this.updatePlayerStatus(status.playersConnected);
        });
    }

    initializeControls() {
        // Playlist selection
        this.playlistSelect.addEventListener('change', (e) => {
            const selectedPlaylist = e.target.value;
            if (selectedPlaylist) {
                this.socket.emit('switch-playlist', selectedPlaylist);
            }
        });

        // Playback controls
        this.playPauseBtn.addEventListener('click', () => {
            this.socket.emit('toggle-play-pause');
        });

        this.previousBtn.addEventListener('click', () => {
            this.socket.emit('previous-song');
        });

        this.nextBtn.addEventListener('click', () => {
            this.socket.emit('next-song');
        });

        this.restartBtn.addEventListener('click', () => {
            this.socket.emit('restart-song');
        });

        // Copy link button
        this.copyLinkBtn.addEventListener('click', () => {
            this.copyPlayerLink();
        });

        // Open playlists button
        const openPlaylistsBtn = document.getElementById('open-playlists-btn');
        if (openPlaylistsBtn) {
            openPlaylistsBtn.addEventListener('click', () => {
                this.socket.emit('open-playlists');
            });
        }

        // Open player button
        const openPlayerEditorBtn = document.getElementById('open-player-editor-btn');
        if (openPlayerEditorBtn) {
            openPlayerEditorBtn.addEventListener('click', () => {
                this.socket.emit('open-player-editor-window');
            });
        }
    }

    updateConnectionStatus() {
        if (this.isConnected) {
            this.connectionStatus.textContent = 'Server Connected';
            this.connectionStatus.className = 'status-indicator connected';
            this.enableControls();
        } else {
            this.connectionStatus.textContent = 'Disconnected';
            this.connectionStatus.className = 'status-indicator disconnected';
            this.disableControls();
        }
    }

    updateInterface(state) {
        // Update playlists dropdown
        this.updatePlaylistsDropdown(state.playlists, state.currentPlaylist);

        // Update current song info
        if (state.currentSong) {
            this.currentSongTitle.textContent = state.currentSong.title;
            this.currentSongArtist.textContent = state.currentSong.artist;
        } else {
            this.currentSongTitle.textContent = 'No song';
            this.currentSongArtist.textContent = 'No artist';
        }

        // Update playback state
        this.updatePlaybackState(state.isPlaying, state.isPaused);

        // Update play/pause button
        this.updatePlayPauseButton(state.isPlaying, state.isPaused);
    }

    updatePlaylistsDropdown(playlists, currentPlaylist) {
        // Clear existing options except the first one
        this.playlistSelect.innerHTML = '<option value="">Select playlist...</option>';

        // Add playlist options
        playlists.forEach(playlist => {
            const option = document.createElement('option');
            option.value = playlist;
            option.textContent = playlist;
            if (playlist === currentPlaylist) {
                option.selected = true;
            }
            this.playlistSelect.appendChild(option);
        });
    }

    updatePlaybackState(isPlaying, isPaused) {
        let stateText = 'Stopped';
        if (isPlaying && !isPaused) {
            stateText = 'Playing';
        } else if (isPlaying && isPaused) {
            stateText = 'Paused';
        }
        this.playbackState.textContent = stateText;
    }

    updatePlayerStatus(playersConnected) {
        if (playersConnected) {
            this.playerStatus.textContent = 'Player Connected';
            this.playerStatus.className = 'status-indicator connected';
        } else {
            this.playerStatus.textContent = 'No Player';
            this.playerStatus.className = 'status-indicator disconnected';
        }
    }

    updatePlayPauseButton(isPlaying, isPaused) {
        if (isPlaying && !isPaused) {
            this.playPauseIcon.textContent = '⏸️';
            this.playPauseBtn.title = 'Pause';
        } else {
            this.playPauseIcon.textContent = '▶️';
            this.playPauseBtn.title = 'Play';
        }
    }

    enableControls() {
        this.playlistSelect.disabled = false;
        this.playPauseBtn.disabled = false;
        this.previousBtn.disabled = false;
        this.nextBtn.disabled = false;
        this.restartBtn.disabled = false;
    }

    disableControls() {
        this.playlistSelect.disabled = true;
        this.playPauseBtn.disabled = true;
        this.previousBtn.disabled = true;
        this.nextBtn.disabled = true;
        this.restartBtn.disabled = true;
    }

    showError(message) {
        this.currentSongTitle.textContent = 'Error';
        this.currentSongArtist.textContent = message;
        this.playbackState.textContent = 'Error';
    }

    async copyPlayerLink() {
        try {
            const playerUrl = `${window.location.origin}/player`;
            await navigator.clipboard.writeText(playerUrl);
            
            // Update button text and style
            const originalText = this.copyLinkBtn.textContent;
            this.copyLinkBtn.textContent = '✅ Link copied !';
            this.copyLinkBtn.classList.add('copied');
            
            // Reset after 2 seconds
            setTimeout(() => {
                this.copyLinkBtn.textContent = originalText;
                this.copyLinkBtn.classList.remove('copied');
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy link:', error);
            
            // Fallback for older browsers
            this.fallbackCopyPlayerLink();
        }
    }

    fallbackCopyPlayerLink() {
        try {
            const playerUrl = `${window.location.origin}/player`;
            const textArea = document.createElement('textarea');
            textArea.value = playerUrl;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                // Update button text and style
                const originalText = this.copyLinkBtn.textContent;
                this.copyLinkBtn.textContent = '✅ Link copied !';
                this.copyLinkBtn.classList.add('copied');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    this.copyLinkBtn.textContent = originalText;
                    this.copyLinkBtn.classList.remove('copied');
                }, 2000);
            } else {
                throw new Error('Copy command failed');
            }
        } catch (error) {
            console.error('Fallback copy failed:', error);
            
            // Show error state
            const originalText = this.copyLinkBtn.textContent;
            this.copyLinkBtn.textContent = '❌ Copy failed';
            
            setTimeout(() => {
                this.copyLinkBtn.textContent = originalText;
            }, 2000);
        }
    }
}

// Initialize remote control when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.remoteControl = new RemoteControl();
});