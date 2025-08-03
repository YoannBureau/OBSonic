import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import MusicManager from './utils/musicManager.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

const PORT = process.env.PORT || 3000;
const PLAYLISTS_DIR = path.join(__dirname, 'playlists');

// Initialize music manager (will be set after socket.io is created)
let musicManager;

// Serve static files
app.use(express.static('public'));
app.use('/playlists', express.static(PLAYLISTS_DIR));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

app.get('/player', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

app.get('/remote', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});

// API endpoints
app.get('/api/playlists', async (req, res) => {
    try {
        const playlists = await musicManager.getPlaylists();
        res.json(playlists);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/current-state', async (req, res) => {
    try {
        const state = await musicManager.getCurrentState();
        res.json(state);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Socket.io for real-time communication
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send current state to newly connected client
    musicManager.getCurrentState().then(state => {
        socket.emit('state-update', state);
    });

    // Handle remote control commands
    socket.on('switch-playlist', async (playlistName) => {
        try {
            await musicManager.switchPlaylist(playlistName);
            const state = await musicManager.getCurrentState();
            io.emit('state-update', state);
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    socket.on('next-song', async () => {
        try {
            await musicManager.nextSong();
            const state = await musicManager.getCurrentState();
            io.emit('state-update', state);
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    socket.on('previous-song', async () => {
        try {
            await musicManager.previousSong();
            const state = await musicManager.getCurrentState();
            io.emit('state-update', state);
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    socket.on('restart-song', async () => {
        try {
            await musicManager.restartCurrentSong();
            const state = await musicManager.getCurrentState();
            io.emit('state-update', state);
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    socket.on('toggle-play-pause', async () => {
        try {
            await musicManager.togglePlayPause();
            const state = await musicManager.getCurrentState();
            io.emit('state-update', state);
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Initialize and start server
async function startServer() {
    try {
        // Initialize music manager with socket.io instance
        musicManager = new MusicManager(PLAYLISTS_DIR, io);
        await musicManager.initialize();
        console.log('Music manager initialized');
        
        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Player: http://localhost:${PORT}/player`);
            console.log(`Remote: http://localhost:${PORT}/remote`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Graceful shutdown...');
    if (musicManager) {
        musicManager.cleanup();
    }
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Graceful shutdown...');
    if (musicManager) {
        musicManager.cleanup();
    }
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

startServer();