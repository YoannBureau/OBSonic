const fs = require('fs').promises;
const path = require('path');
const { parseFile } = require('music-metadata');

class MusicManager {
    constructor(playlistsDir) {
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
    }

    async initialize() {
        await this.loadPlaylists();
        if (this.playlists.size > 0) {
            // Start with first playlist alphabetically
            const firstPlaylist = Array.from(this.playlists.keys()).sort()[0];
            await this.switchPlaylist(firstPlaylist);
        }
    }

    async loadPlaylists() {
        try {
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
}

module.exports = MusicManager;