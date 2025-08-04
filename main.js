import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import StateManager from './utils/stateManager.js';
import { fileURLToPath } from 'url';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'fs';
import { exec } from 'child_process';
import MusicManager from './utils/musicManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import electron-store dynamically to handle ES module requirement
let Store;
async function initializeStore() {
    const electronStore = await import('electron-store');
    Store = electronStore.default;
    return new Store();
}

// Keep a global reference of the window object
let mainWindow;
let webServer;
let musicManager;
let store;

function createWindow() {
    // Create the browser window for the remote control
    mainWindow = new BrowserWindow({
        width: 450,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        title: 'Music Remote Control',
        icon: path.join(__dirname, 'public', 'assets', 'icon.png'),
        resizable: true,
        minimizable: true,
        maximizable: false,
        show: false // Don't show until ready
    });

    // Load the remote control page
    mainWindow.loadURL('http://localhost:3000/remote');

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('Remote control window opened');
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Optional: Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        // mainWindow.webContents.openDevTools();
    }

    // Handle connection errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load remote control page:', errorDescription);
        // Retry after a short delay
        setTimeout(() => {
            mainWindow.loadURL('http://localhost:3000/remote');
        }, 2000);
    });
}

// Create minimal menu (removes default Electron menu)
function createMenu() {
    const template = [
        {
            label: 'Music Player',
            submenu: [
                {
                    label: 'Open Player in Browser',
                    click: async () => {
                        const { shell } = await import('electron');
                        shell.openExternal('http://localhost:3000/player');
                    }
                },
                {
                    label: 'Reload Remote',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.reload();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        }
    ];

    const menu = null; //Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Start the server and then create window
async function startApp() {
    console.log('Starting server...');
    
    // Initialize electron-store
    try {
        store = await initializeStore();
        console.log('Electron store initialized');
    } catch (error) {
        console.warn('Failed to initialize electron-store, using fallback:', error.message);
    }
    
    // Get the last playlist from store
    const lastPlaylist = getLastPlaylist();
    console.log(`Last playlist from store: ${lastPlaylist}`);
    
    // Set the last playlist environment variable if available
    if (lastPlaylist) {
        process.env.LAST_PLAYLIST = lastPlaylist;
    }
    
    // Start the Express server directly in this process
    await startWebServer();
    
    console.log('Server ready, opening Electron window...');
    createWindow();
    createMenu();
}

// Start the web server directly (integrated from server.js)
async function startWebServer() {
    const expressApp = express();
    const server = http.createServer(expressApp);
    const io = new SocketIOServer(server);
    
    const PORT = process.env.PORT || 3000;
    // PLAYLISTS_DIR will be set below with proper path resolution
    
    // Track connected players
    let connectedPlayers = new Set();
    
    // Serve static files with absolute paths - handle both dev and packaged app
    let publicDir, playlistsDir;
    
    if (app.isPackaged) {
        // In packaged app, resources are in different location
        const resourcesPath = process.resourcesPath;
        publicDir = path.join(resourcesPath, 'app', 'public');
        playlistsDir = path.join(resourcesPath, 'app', 'playlists');
        
        // Fallback if the above doesn't work
        if (!fs.existsSync(publicDir)) {
            publicDir = path.join(__dirname, 'public');
            playlistsDir = path.join(__dirname, 'playlists');
        }
    } else {
        // In development
        publicDir = path.join(__dirname, 'public');
        playlistsDir = path.join(__dirname, 'playlists');
    }
    
    console.log('App packaged:', app.isPackaged);
    console.log('__dirname:', __dirname);
    console.log('Public directory path:', publicDir);
    console.log('Public directory exists:', fs.existsSync(publicDir));
    console.log('Playlists directory path:', playlistsDir);
    console.log('Playlists directory exists:', fs.existsSync(playlistsDir));
    
    // Log contents of public directory if it exists
    if (fs.existsSync(publicDir)) {
        const publicContents = fs.readdirSync(publicDir);
        console.log('Public directory contents:', publicContents);
    }
    
    expressApp.use(express.static(publicDir));
    expressApp.use('/playlists', express.static(playlistsDir));
    
    // Routes with absolute paths
    expressApp.get('/', (req, res) => {
        res.sendFile(path.join(publicDir, 'player.html'));
    });
    
    expressApp.get('/player', (req, res) => {
        res.sendFile(path.join(publicDir, 'player.html'));
    });
    
    expressApp.get('/remote', (req, res) => {
        res.sendFile(path.join(publicDir, 'remote.html'));
    });
    
    // API endpoints
    expressApp.get('/api/playlists', async (req, res) => {
        try {
            const playlists = await musicManager.getPlaylists();
            res.json(playlists);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    expressApp.get('/api/current-state', async (req, res) => {
        try {
            const state = await musicManager.getCurrentState();
            res.json(state);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Cross-platform function to open playlists folder
    function openPlaylistsFolder() {
        const platform = process.platform;
        let command;
        
        switch (platform) {
            case 'win32':
                command = `start "" "${playlistsDir}"`;
                break;
            case 'darwin':
                command = `open "${playlistsDir}"`;
                break;
            case 'linux':
            default:
                command = `xdg-open "${playlistsDir}"`;
                break;
        }
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                if (platform === 'win32' && error.code === 1) {
                    console.log(`Opened playlists folder: ${playlistsDir}`);
                    return;
                }
                console.error(`Error opening playlists folder: ${error.message}`);
                return;
            }
            if (stderr && platform !== 'win32') {
                console.error(`Error output: ${stderr}`);
                return;
            }
            console.log(`Opened playlists folder: ${playlistsDir}`);
        });
    }
    
    // Socket.io for real-time communication
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        
        // Send current state to newly connected client
        musicManager.getCurrentState().then(state => {
            socket.emit('state-update', state);
            socket.emit('player-status', { playersConnected: connectedPlayers.size > 0 });
        });
        
        // Handle player identification
        socket.on('identify-as-player', () => {
            console.log('Player identified:', socket.id);
            connectedPlayers.add(socket.id);
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
            if (connectedPlayers.has(socket.id)) {
                connectedPlayers.delete(socket.id);
                console.log('Player disconnected:', socket.id);
                io.emit('player-status', { playersConnected: connectedPlayers.size > 0 });
            }
        });
    });
    
    // Initialize music manager with socket.io instance
    musicManager = new MusicManager(playlistsDir, io);
    await musicManager.initialize();
    console.log('Music manager initialized');
    
    // Start the server
    return new Promise((resolve, reject) => {
        webServer = server.listen(PORT, (error) => {
            if (error) {
                reject(error);
            } else {
                console.log(`Server running on http://localhost:${PORT}`);
                console.log(`Player: http://localhost:${PORT}/player`);
                console.log(`Remote: http://localhost:${PORT}/remote`);
                resolve();
            }
        });
    });
}



// App event handlers
app.whenReady().then(() => {
    startApp();

    app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    // Close the web server
    if (webServer) {
        webServer.close();
    }
    
    // Cleanup music manager
    if (musicManager) {
        musicManager.cleanup();
    }
    
    // On macOS, applications stay active until explicitly quit
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle app quit
app.on('before-quit', () => {
    if (webServer) {
        webServer.close();
    }
    if (musicManager) {
        musicManager.cleanup();
    }
});

// Helper function to save playlist state
function savePlaylistState(playlistName) {
    if (store) {
        store.set('lastPlaylist', playlistName);
    }
    StateManager.saveLastPlaylist(playlistName);
    console.log(`Saved last playlist: ${playlistName}`);
}

// Helper function to get last playlist
function getLastPlaylist() {
    // Try electron-store first, then fallback to StateManager
    let fromStore = null;
    if (store) {
        fromStore = store.get('lastPlaylist', null);
    }
    const fromState = StateManager.getLastPlaylist();
    return fromStore || fromState;
}

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', async (event, navigationUrl) => {
        event.preventDefault();
        // Open in default browser instead
        const { shell } = await import('electron');
        shell.openExternal(navigationUrl);
    });
});

console.log('Electron app starting...');