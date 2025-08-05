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

// Configuration constants
const CONFIG = {
    PORT: process.env.PORT || 3000,
    WINDOW: {
        width: 450,
        height: 700,
        resizable: false,
        minimizable: true,
        maximizable: false
    },
    RETRY_DELAY: 2000
};

// Application state
const appState = {
    mainWindow: null,
    webServer: null,
    musicManager: null,
    store: null,
    socketServer: null,
    connectedPlayers: new Set()
};

// Initialize electron-store dynamically
async function initializeStore() {
    try {
        const electronStore = await import('electron-store');
        return new electronStore.default();
    } catch (error) {
        console.warn('Failed to initialize electron-store:', error.message);
        return null;
    }
}

function createWindow() {
    appState.mainWindow = new BrowserWindow({
        ...CONFIG.WINDOW,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        title: 'OBSonic',
        icon: path.join(__dirname, 'public', 'assets', 'icon.png'),
        show: false
    });

    Menu.setApplicationMenu(null); // Remove default menu

    const remoteUrl = `http://localhost:${CONFIG.PORT}/remote`;
    appState.mainWindow.loadURL(remoteUrl);

    setupWindowEvents();
}

function setupWindowEvents() {
    appState.mainWindow.once('ready-to-show', () => {
        appState.mainWindow.show();
        console.log('Remote control window opened');
    });

    appState.mainWindow.on('closed', async () => {
        await stopMusic();
        appState.mainWindow = null;
    });

    appState.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load remote control page:', errorDescription);
        setTimeout(() => {
            const remoteUrl = `http://localhost:${CONFIG.PORT}/remote`;
            appState.mainWindow.loadURL(remoteUrl);
        }, CONFIG.RETRY_DELAY);
    });
}

async function stopMusic() {
    if (appState.musicManager) {
        try {
            await appState.musicManager.stop();
        } catch (error) {
            console.error('Error stopping music:', error);
        }
    }
}

async function startApp() {
    console.log('Starting server...');

    appState.store = await initializeStore();
    if (appState.store) {
        console.log('Electron store initialized');
    }

    const lastPlaylist = getLastPlaylist();
    if (lastPlaylist) {
        console.log(`Last playlist from store: ${lastPlaylist}`);
        process.env.LAST_PLAYLIST = lastPlaylist;
    }

    await startWebServer();

    console.log('Server ready, opening Electron window...');
    createWindow();
}

function resolvePaths() {
    let publicDir, playlistsDir;

    if (app.isPackaged) {
        const resourcesPath = process.resourcesPath;
        publicDir = path.join(resourcesPath, 'app', 'public');
        playlistsDir = path.join(resourcesPath, 'app', 'playlists');

        if (!fs.existsSync(publicDir)) {
            publicDir = path.join(__dirname, 'public');
            playlistsDir = path.join(__dirname, 'playlists');
        }
    } else {
        publicDir = path.join(__dirname, 'public');
        playlistsDir = path.join(__dirname, 'playlists');
    }

    logPathInfo(publicDir, playlistsDir);
    return { publicDir, playlistsDir };
}

function logPathInfo(publicDir, playlistsDir) {
    console.log('App packaged:', app.isPackaged);
    console.log('__dirname:', __dirname);
    console.log('Public directory path:', publicDir);
    console.log('Public directory exists:', fs.existsSync(publicDir));
    console.log('Playlists directory path:', playlistsDir);
    console.log('Playlists directory exists:', fs.existsSync(playlistsDir));

    if (fs.existsSync(publicDir)) {
        const publicContents = fs.readdirSync(publicDir);
        console.log('Public directory contents:', publicContents);
    }
}

function setupExpressApp(expressApp, publicDir, playlistsDir) {
    expressApp.use(express.static(publicDir));
    expressApp.use('/playlists', express.static(playlistsDir));
}

function setupRoutes(expressApp, publicDir) {
    const routes = [
        { path: '/', file: 'player/player.html' },
        { path: '/player', file: 'player/player.html' },
        { path: '/remote', file: 'remote/remote.html' }
    ];

    routes.forEach(({ path: routePath, file }) => {
        expressApp.get(routePath, (req, res) => {
            res.sendFile(path.join(publicDir, file));
        });
    });
}

function setupApiRoutes(expressApp) {
    expressApp.get('/api/playlists', async (req, res) => {
        try {
            const playlists = await appState.musicManager.getPlaylists();
            res.json(playlists);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    expressApp.get('/api/current-state', async (req, res) => {
        try {
            const state = await appState.musicManager.getCurrentState();
            res.json(state);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

async function startWebServer() {
    const expressApp = express();
    const server = http.createServer(expressApp);
    const io = new SocketIOServer(server);

    const { publicDir, playlistsDir } = resolvePaths();

    setupExpressApp(expressApp, publicDir, playlistsDir);
    setupRoutes(expressApp, publicDir);
    setupApiRoutes(expressApp);
    setupSocketIO(io, playlistsDir);

    appState.socketServer = io;
    appState.musicManager = new MusicManager(playlistsDir, io);
    await appState.musicManager.initialize();
    console.log('Music manager initialized');

    return startServer(server);
}

function openPlaylistsFolder(playlistsDir) {
    const commands = {
        win32: `start "" "${playlistsDir}"`,
        darwin: `open "${playlistsDir}"`,
        linux: `xdg-open "${playlistsDir}"`
    };

    const command = commands[process.platform] || commands.linux;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            if (process.platform === 'win32' && error.code === 1) {
                console.log(`Opened playlists folder: ${playlistsDir}`);
                return;
            }
            console.error(`Error opening playlists folder: ${error.message}`);
            return;
        }
        if (stderr && process.platform !== 'win32') {
            console.error(`Error output: ${stderr}`);
            return;
        }
        console.log(`Opened playlists folder: ${playlistsDir}`);
    });
}

async function handleMusicManagerAction(action, socket, io, ...args) {
    try {
        await appState.musicManager[action](...args);
        const state = await appState.musicManager.getCurrentState();
        io.emit('state-update', state);
    } catch (error) {
        socket.emit('error', error.message);
    }
}

function setupSocketIO(io, playlistsDir) {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Send current state to newly connected client
        appState.musicManager.getCurrentState().then(state => {
            socket.emit('state-update', state);
            socket.emit('player-status', { playersConnected: appState.connectedPlayers.size > 0 });
        });

        // Handle player identification
        socket.on('identify-as-player', () => {
            console.log('Player identified:', socket.id);
            appState.connectedPlayers.add(socket.id);
            io.emit('player-status', { playersConnected: appState.connectedPlayers.size > 0 });
        });

        // Handle music control actions
        socket.on('switch-playlist', async (playlistName) => {
            await handleMusicManagerAction('switchPlaylist', socket, io, playlistName);
        });

        socket.on('next-song', async () => {
            await handleMusicManagerAction('nextSong', socket, io);
        });

        socket.on('previous-song', async () => {
            await handleMusicManagerAction('previousSong', socket, io);
        });

        socket.on('restart-song', async () => {
            await handleMusicManagerAction('restartCurrentSong', socket, io);
        });

        socket.on('toggle-play-pause', async () => {
            await handleMusicManagerAction('togglePlayPause', socket, io);
        });

        socket.on('open-playlists', () => {
            try {
                openPlaylistsFolder(playlistsDir);
            } catch (error) {
                console.error('Error opening playlists folder:', error);
                socket.emit('error', 'Failed to open playlists folder');
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            if (appState.connectedPlayers.has(socket.id)) {
                appState.connectedPlayers.delete(socket.id);
                console.log('Player disconnected:', socket.id);
                io.emit('player-status', { playersConnected: appState.connectedPlayers.size > 0 });
            }
        });
    });
}

function startServer(server) {
    return new Promise((resolve, reject) => {
        appState.webServer = server.listen(CONFIG.PORT, (error) => {
            if (error) {
                reject(error);
            } else {
                console.log(`Server running on http://localhost:${CONFIG.PORT}`);
                console.log(`Player: http://localhost:${CONFIG.PORT}/player`);
                console.log(`Remote: http://localhost:${CONFIG.PORT}/remote`);
                resolve();
            }
        });
    });
}

async function cleanupApp() {
    await stopMusic();

    if (appState.webServer) {
        appState.webServer.close();
    }

    if (appState.musicManager) {
        appState.musicManager.cleanup();
    }
}

function createAppEventHandlers() {
    // App event handlers
    app.whenReady().then(() => {
        startApp();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', async () => {
        await cleanupApp();

        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('before-quit', cleanupApp);

    // Security: Prevent new window creation
    app.on('web-contents-created', (event, contents) => {
        contents.on('new-window', async (event, navigationUrl) => {
            event.preventDefault();
            const { shell } = await import('electron');
            shell.openExternal(navigationUrl);
        });
    });
}

function savePlaylistState(playlistName) {
    if (appState.store) {
        appState.store.set('lastPlaylist', playlistName);
    }
    StateManager.saveLastPlaylist(playlistName);
    console.log(`Saved last playlist: ${playlistName}`);
}

function getLastPlaylist() {
    const fromStore = appState.store?.get('lastPlaylist', null);
    const fromState = StateManager.getLastPlaylist();
    return fromStore || fromState;
}

createAppEventHandlers();

console.log('Electron app starting...');