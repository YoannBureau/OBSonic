class RemoteControl {
    constructor() {
        this.socket = io();
        this.playlistSelect = document.getElementById('playlist-select');
        this.connectionStatus = document.getElementById('connection-status');
        this.currentSongTitle = document.getElementById('current-song-title');
        this.currentSongArtist = document.getElementById('current-song-artist');
        this.playlistName = document.getElementById('playlist-name');
        this.playbackState = document.getElementById('playback-state');
        this.playerStatus = document.getElementById('player-status');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.playPauseIcon = document.getElementById('play-pause-icon');
        this.previousBtn = document.getElementById('previous-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.restartBtn = document.getElementById('restart-btn');

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

        // Update playlist name
        this.playlistName.textContent = state.currentPlaylist || 'No playlist selected';

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
}

// Initialize remote control when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.remoteControl = new RemoteControl();
});