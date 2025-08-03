class MusicPlayer {
    constructor() {
        this.socket = io();
        this.audioPlayer = document.getElementById('audio-player');
        this.songTitle = document.getElementById('song-title');
        this.songArtist = document.getElementById('song-artist');
        this.currentPlaylist = document.getElementById('current-playlist');
        this.albumCover = document.getElementById('album-cover');
        this.noCover = document.getElementById('no-cover');
        
        this.currentSong = null;
        this.isLoading = false;

        this.initializeSocketListeners();
        this.initializeAudioEvents();
    }

    initializeSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('state-update', (state) => {
            this.updatePlayerState(state);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showError(error);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showError('Connection lost. Trying to reconnect...');
        });
    }

    initializeAudioEvents() {
        this.audioPlayer.addEventListener('loadstart', () => {
            console.log('Loading audio...');
            this.isLoading = true;
        });

        this.audioPlayer.addEventListener('canplay', () => {
            console.log('Audio ready to play');
            this.isLoading = false;
        });

        this.audioPlayer.addEventListener('ended', () => {
            console.log('Song ended, requesting next song');
            this.socket.emit('next-song');
        });

        this.audioPlayer.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.showError('Failed to load audio file');
        });

        this.audioPlayer.addEventListener('play', () => {
            console.log('Audio started playing');
        });

        this.audioPlayer.addEventListener('pause', () => {
            console.log('Audio paused');
        });
    }

    updatePlayerState(state) {
        console.log('Updating player state:', state);

        // Update playlist info
        if (state.currentPlaylist) {
            this.currentPlaylist.textContent = state.currentPlaylist;
        }

        // Update song info
        if (state.currentSong) {
            this.updateSongDisplay(state.currentSong);
            this.loadAudio(state.currentSong, state.isPlaying, state.isPaused);
        }
    }

    updateSongDisplay(song) {
        this.currentSong = song;
        this.songTitle.textContent = song.title;
        this.songArtist.textContent = song.artist;

        // Handle album cover
        if (song.picture) {
            const coverUrl = this.getCoverImageUrl(song.picture);
            this.albumCover.src = coverUrl;
            this.albumCover.style.display = 'block';
            this.noCover.style.display = 'none';
        } else {
            this.albumCover.style.display = 'none';
            this.noCover.style.display = 'flex';
        }
    }

    getCoverImageUrl(picture) {
        return `data:${picture.format};base64,${picture.data}`;
    }

    loadAudio(song, isPlaying, isPaused) {
        const audioUrl = `/playlists/${song.relativePath}`;
        
        // Only reload if it's a different song
        if (this.audioPlayer.src !== audioUrl) {
            this.audioPlayer.src = audioUrl;
            this.audioPlayer.load();
        }

        // Handle play/pause state
        if (isPlaying && !isPaused) {
            this.audioPlayer.play().catch(error => {
                console.error('Failed to play audio:', error);
                this.showError('Failed to play audio');
            });
        } else if (isPaused) {
            this.audioPlayer.pause();
        }
    }

    showError(message) {
        this.songTitle.textContent = 'Error';
        this.songArtist.textContent = message;
        this.albumCover.style.display = 'none';
        this.noCover.style.display = 'flex';
    }
}

// Initialize player when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});