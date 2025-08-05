import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
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

// Track connected players
let connectedPlayers = new Set();

// Serve static files
app.use(express.static('public'));
app.use('/playlists', express.static(PLAYLISTS_DIR));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player', 'player.html'));
});

app.get('/player', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player', 'player.html'));
});

app.get('/remote', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'remote', 'remote.html'));
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
        // Also send current player connection status
        socket.emit('player-status', { playersConnected: connectedPlayers.size > 0 });
    });

    // Handle player identification
    socket.on('identify-as-player', () => {
        console.log('Player identified:', socket.id);
        connectedPlayers.add(socket.id);
        // Broadcast player connection status to all clients
        io.emit('player-status', { playersConnected: connectedPlayers.size > 0 });
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

    socket.on('open-playlists', () => {
        try {
            openPlaylistsFolder();
        } catch (error) {
            console.error('Error opening playlists folder:', error);
            socket.emit('error', 'Failed to open playlists folder');
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Remove from players if it was a player
        if (connectedPlayers.has(socket.id)) {
            connectedPlayers.delete(socket.id);
            console.log('Player disconnected:', socket.id);
            // Broadcast updated player connection status
            io.emit('player-status', { playersConnected: connectedPlayers.size > 0 });
        }
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

// Cross-platform function to open playlists folder in system explorer
function openPlaylistsFolder() {
    const platform = process.platform;
    let command;

    switch (platform) {
        case 'win32':
            // Windows - use start command to avoid explorer exit code issues
            command = `start "" "${PLAYLISTS_DIR}"`;
            break;
        case 'darwin':
            // macOS
            command = `open "${PLAYLISTS_DIR}"`;
            break;
        case 'linux':
        default:
            // Linux and other Unix-like systems
            command = `xdg-open "${PLAYLISTS_DIR}"`;
            break;
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            // For Windows, explorer/start commands often return non-zero exit codes even on success
            if (platform === 'win32' && error.code === 1) {
                console.log(`Opened playlists folder: ${PLAYLISTS_DIR}`);
                return;
            }
            console.error(`Error opening playlists folder: ${error.message}`);
            return;
        }
        if (stderr && platform !== 'win32') {
            // Ignore stderr on Windows as it's often not an actual error
            console.error(`Error output: ${stderr}`);
            return;
        }
        console.log(`Opened playlists folder: ${PLAYLISTS_DIR}`);
    });
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