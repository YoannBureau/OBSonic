const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { parseFile } = require('music-metadata');

class MusicManager {
    constructor(playlistsDir, socketIo = null) {
        this.playlistsDir = playlistsDir;
        this.playlists = new Map();
        this.currentPlaylist = null;
        this.currentSong = null;
        this.currentSongIndex = -1;
        this.playedSongs = new Set();
        this.shuffledSongs = [];
        this.isPlaying = false;
        this.isPaused = false;
        this.shouldRestart = false;
        this.socketIo = socketIo;
        this.watcher = null;
    }

    async initialize() {
        await this.loadPlaylists();
        if (this.playlists.size > 0) {
            // Start with first playlist alphabetically
            const firstPlaylist = Array.from(this.playlists.keys()).sort()[0];
            await this.switchPlaylist(firstPlaylist);
        }
        
        // Start watching for playlist changes
        this.startWatching();
    }

    async loadPlaylists() {
        try {
            // Clear existing playlists to ensure deleted folders are removed
            this.playlists.clear();
            
            const entries = await fs.readdir(this.playlistsDir, { withFileTypes: true });
            const playlistDirs = entries.filter(entry => entry.isDirectory());

            for (const dir of playlistDirs) {
                const playlistPath = path.join(this.playlistsDir, dir.name);
                const songs = await this.loadSongsFromDirectory(playlistPath);
                if (songs.length > 0) {
                    this.playlists.set(dir.name, songs);
                }
            }

            console.log(`Loaded ${this.playlists.size} playlists`);
        } catch (error) {
            console.error('Error loading playlists:', error);
            throw error;
        }
    }

    async loadSongsFromDirectory(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            const mp3Files = files.filter(file => path.extname(file).toLowerCase() === '.mp3');
            
            const songs = [];
            for (const file of mp3Files) {
                const filePath = path.join(dirPath, file);
                try {
                    const metadata = await parseFile(filePath);
                    
                    // Process album art if available
                    let pictureData = null;
                    if (metadata.common.picture && metadata.common.picture.length > 0) {
                        const picture = metadata.common.picture[0];
                        pictureData = {
                            format: picture.format,
                            data: Buffer.from(picture.data).toString('base64')
                        };
                    }
                    
                    songs.push({
                        filename: file,
                        filepath: filePath,
                        relativePath: path.relative(this.playlistsDir, filePath),
                        title: metadata.common.title || path.basename(file, '.mp3'),
                        artist: metadata.common.artist || 'Unknown Artist',
                        album: metadata.common.album || 'Unknown Album',
                        duration: metadata.format.duration || 0,
                        picture: pictureData
                    });
                } catch (metadataError) {
                    // If metadata parsing fails, use filename
                    console.warn(`Could not parse metadata for ${file}:`, metadataError.message);
                    songs.push({
                        filename: file,
                        filepath: filePath,
                        relativePath: path.relative(this.playlistsDir, filePath),
                        title: path.basename(file, '.mp3'),
                        artist: 'Unknown Artist',
                        album: 'Unknown Album',
                        duration: 0,
                        picture: null
                    });
                }
            }

            return songs;
        } catch (error) {
            console.error(`Error loading songs from ${dirPath}:`, error);
            return [];
        }
    }

    async switchPlaylist(playlistName) {
        if (!this.playlists.has(playlistName)) {
            throw new Error(`Playlist "${playlistName}" not found`);
        }

        this.currentPlaylist = playlistName;
        this.playedSongs.clear();
        this.shuffleSongs();
        this.currentSongIndex = 0;
        this.currentSong = this.shuffledSongs[0];
        this.isPlaying = true;
        this.isPaused = false;

        console.log(`Switched to playlist: ${playlistName}`);
    }

    shuffleSongs() {
        const songs = [...this.playlists.get(this.currentPlaylist)];
        // Fisher-Yates shuffle
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songs[i], songs[j]] = [songs[j], songs[i]];
        }
        this.shuffledSongs = songs;
    }

    async nextSong() {
        if (!this.currentPlaylist || this.shuffledSongs.length === 0) {
            throw new Error('No playlist selected or playlist is empty');
        }

        // Mark current song as played
        if (this.currentSong) {
            this.playedSongs.add(this.currentSong.filename);
        }

        // Check if all songs have been played
        if (this.playedSongs.size >= this.shuffledSongs.length) {
            // Reset and reshuffle
            this.playedSongs.clear();
            this.shuffleSongs();
            this.currentSongIndex = 0;
        } else {
            this.currentSongIndex++;
            if (this.currentSongIndex >= this.shuffledSongs.length) {
                this.currentSongIndex = 0;
            }
        }

        this.currentSong = this.shuffledSongs[this.currentSongIndex];
        this.isPlaying = true;
        this.isPaused = false;

        console.log(`Next song: ${this.currentSong.title}`);
    }

    async previousSong() {
        if (!this.currentPlaylist || this.shuffledSongs.length === 0) {
            throw new Error('No playlist selected or playlist is empty');
        }

        this.currentSongIndex--;
        if (this.currentSongIndex < 0) {
            this.currentSongIndex = this.shuffledSongs.length - 1;
        }

        this.currentSong = this.shuffledSongs[this.currentSongIndex];
        this.isPlaying = true;
        this.isPaused = false;

        console.log(`Previous song: ${this.currentSong.title}`);
    }

    async restartCurrentSong() {
        if (!this.currentSong) {
            throw new Error('No current song to restart');
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.shouldRestart = true;

        console.log(`Restarting song: ${this.currentSong.title}`);
    }

    async togglePlayPause() {
        if (!this.currentSong) {
            throw new Error('No current song to play/pause');
        }

        if (this.isPlaying && !this.isPaused) {
            this.isPaused = true;
            console.log('Music paused');
        } else {
            this.isPlaying = true;
            this.isPaused = false;
            console.log('Music resumed');
        }
    }

    async getPlaylists() {
        return Array.from(this.playlists.keys()).sort();
    }

    async getCurrentState() {
        const state = {
            currentPlaylist: this.currentPlaylist,
            currentSong: this.currentSong,
            isPlaying: this.isPlaying,
            isPaused: this.isPaused,
            shouldRestart: this.shouldRestart,
            playlists: await this.getPlaylists(),
            playedSongs: Array.from(this.playedSongs),
            totalSongs: this.shuffledSongs.length
        };
        
        // Reset the restart flag after sending it
        this.shouldRestart = false;
        
        return state;
    }

    // Get cover image as base64 data URL
    getCoverImageBase64(song) {
        if (song && song.picture) {
            return `data:${song.picture.format};base64,${song.picture.data}`;
        }
        return null;
    }

    // Start watching the playlists directory for changes
    startWatching() {
        try {
            console.log('Starting playlist directory watcher...');
            this.watcher = fsSync.watch(this.playlistsDir, { persistent: true }, async (eventType, filename) => {
                console.log(`Playlist directory change detected: ${eventType} - ${filename}`);
                
                // Debounce rapid changes (wait 1 second before reloading)
                clearTimeout(this.watcherTimeout);
                this.watcherTimeout = setTimeout(async () => {
                    await this.reloadPlaylists();
                }, 1000);
            });
            
            console.log('Playlist directory watcher started');
        } catch (error) {
            console.error('Error starting playlist watcher:', error);
        }
    }

    // Stop watching the playlists directory
    stopWatching() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            console.log('Playlist directory watcher stopped');
        }
        if (this.watcherTimeout) {
            clearTimeout(this.watcherTimeout);
        }
    }

    // Reload playlists and notify clients
    async reloadPlaylists() {
        try {
            console.log('Reloading playlists...');
            const oldPlaylistCount = this.playlists.size;
            const oldPlaylists = new Set(this.playlists.keys());
            
            await this.loadPlaylists();
            const newPlaylists = new Set(this.playlists.keys());
            
            // Check if current playlist still exists
            if (this.currentPlaylist && !this.playlists.has(this.currentPlaylist)) {
                console.log(`Current playlist "${this.currentPlaylist}" was removed`);
                // Switch to first available playlist
                if (this.playlists.size > 0) {
                    const firstPlaylist = Array.from(this.playlists.keys()).sort()[0];
                    await this.switchPlaylist(firstPlaylist);
                } else {
                    // No playlists left
                    this.currentPlaylist = null;
                    this.currentSong = null;
                    this.shuffledSongs = [];
                    this.playedSongs.clear();
                    this.isPlaying = false;
                }
            }
            
            // Log changes
            const added = [...newPlaylists].filter(p => !oldPlaylists.has(p));
            const removed = [...oldPlaylists].filter(p => !newPlaylists.has(p));
            
            if (added.length > 0) {
                console.log(`Added playlists: ${added.join(', ')}`);
            }
            if (removed.length > 0) {
                console.log(`Removed playlists: ${removed.join(', ')}`);
            }
            
            console.log(`Playlists reloaded: ${this.playlists.size} total`);
            
            // Notify connected clients if socketIo is available
            if (this.socketIo) {
                const state = await this.getCurrentState();
                this.socketIo.emit('state-update', state);
                console.log('Sent playlist update to clients');
            }
            
        } catch (error) {
            console.error('Error reloading playlists:', error);
        }
    }

    // Cleanup method
    cleanup() {
        this.stopWatching();
    }
}

module.exports = MusicManager;