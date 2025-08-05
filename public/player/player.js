class MusicPlayer {
    constructor() {
        this.socket = io();
        this.audioPlayer = document.getElementById('audio-player');
        this.songTitle = document.getElementById('song-title');
        this.songArtist = document.getElementById('song-artist');
        this.currentPlaylist = document.getElementById('current-playlist');
        this.albumCover = document.getElementById('album-cover');
        this.noCover = document.getElementById('no-cover');
        this.playerContainer = document.querySelector('.player-container');
        
        this.currentSong = null;
        this.isLoading = false;
        this.fadeTimeout = null;
        this.isConnected = false;

        this.initializeSocketListeners();
        this.initializeAudioEvents();
    }

    initializeSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            // Identify this client as a player
            this.socket.emit('identify-as-player');
            // Restore normal fade behavior when reconnected
            this.restoreFadeBehavior();
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
            this.isConnected = false;
            this.showError('Connection lost. Trying to reconnect...');
            // Stop music playback when connection is lost
            this.stopMusicOnDisconnect();
            // Make player always visible when disconnected
            this.disableFadeBehavior();
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

        // Handle stopped state (music stopped)
        if (!state.isPlaying && !state.isPaused) {
            console.log('Music stopped - pausing audio');
            if (!this.audioPlayer.paused) {
                this.audioPlayer.pause();
            }
            // Still update song display if there's a current song
            if (state.currentSong) {
                this.updateSongDisplay(state.currentSong);
            }
            return;
        }

        // Update song info and handle play/pause
        if (state.currentSong) {
            this.updateSongDisplay(state.currentSong);
            this.loadAudio(state.currentSong, state.isPlaying, state.isPaused, state.shouldRestart);
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

    loadAudio(song, isPlaying, isPaused, shouldRestart = false) {
        const audioUrl = `/playlists/${song.relativePath}`;
        const currentSrc = this.audioPlayer.src;
        const fullAudioUrl = new URL(audioUrl, window.location.origin).href;
        
        // Reload if it's a different song OR if we need to restart
        if (currentSrc !== fullAudioUrl || shouldRestart) {
            if (shouldRestart) {
                console.log('Restarting song:', song.title);
            } else {
                console.log('Loading new song:', song.title);
            }
            
            this.audioPlayer.src = audioUrl;
            this.audioPlayer.load();
            
            // Wait for the audio to be ready before playing
            if (isPlaying && !isPaused) {
                this.audioPlayer.addEventListener('canplay', () => {
                    this.audioPlayer.play().catch(error => {
                        console.error('Failed to play audio:', error);
                        this.showError('Failed to play audio');
                    });
                    // Show player with fade-away when a new song starts playing
                    this.showPlayerWithFadeAway();
                }, { once: true });
            }
        } else {
            // Same song, just handle play/pause/stop state
            if (isPlaying && !isPaused) {
                if (this.audioPlayer.paused) {
                    console.log('Resuming playback');
                    this.audioPlayer.play().catch(error => {
                        console.error('Failed to resume audio:', error);
                        this.showError('Failed to resume audio');
                    });
                    // Show player with fade-away when playback is resumed
                    this.showPlayerWithFadeAway();
                }
            } else if (isPaused) {
                if (!this.audioPlayer.paused) {
                    console.log('Pausing playback');
                    this.audioPlayer.pause();
                }
            } else if (!isPlaying && !isPaused) {
                // Handle stopped state
                if (!this.audioPlayer.paused) {
                    console.log('Stopping playback');
                    this.audioPlayer.pause();
                }
            }
        }
    }

    showError(message) {
        this.songTitle.textContent = 'Error';
        this.songArtist.textContent = message;
        this.albumCover.style.display = 'none';
        this.noCover.style.display = 'flex';
    }

    showPlayerWithFadeAway() {
        // Only apply fade-away behavior if connected and player has the fade-away class
        if (!this.isConnected || !this.playerContainer.classList.contains('fade-away')) {
            // If disconnected, just make sure player is visible
            if (!this.isConnected) {
                this.playerContainer.classList.remove('fade-out');
                this.playerContainer.classList.add('fade-in');
            }
            return;
        }

        // Clear any existing timeout
        if (this.fadeTimeout) {
            clearTimeout(this.fadeTimeout);
        }

        // Remove fade-out class and add fade-in class
        this.playerContainer.classList.remove('fade-out');
        this.playerContainer.classList.add('fade-in');
        
        // Set timeout to fade out after 10 seconds (only when connected)
        this.fadeTimeout = setTimeout(() => {
            // Double-check we're still connected before fading out
            if (this.isConnected) {
                this.playerContainer.classList.remove('fade-in');
                this.playerContainer.classList.add('fade-out');
            }
        }, 10000); // 10 seconds
    }

    disableFadeBehavior() {
        // Clear any pending fade timeout
        if (this.fadeTimeout) {
            clearTimeout(this.fadeTimeout);
            this.fadeTimeout = null;
        }
        
        // Make player visible and remove fade-away class temporarily
        this.playerContainer.classList.remove('fade-out');
        this.playerContainer.classList.add('fade-in');
        
        console.log('Fade behavior disabled - player will stay visible');
    }

    restoreFadeBehavior() {
        console.log('Fade behavior restored - normal fade in/out behavior activated');
        
        // If there's current song playing, trigger the normal fade behavior
        if (this.currentSong && !this.audioPlayer.paused) {
            this.showPlayerWithFadeAway();
        }
    }

    stopMusicOnDisconnect() {
        if (!this.audioPlayer.paused) {
            console.log('Stopping music playback due to connection loss');
            this.audioPlayer.pause();
            // Reset to beginning of the song so it starts fresh when reconnected
            this.audioPlayer.currentTime = 0;
        }
    }
}

// Initialize player when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});