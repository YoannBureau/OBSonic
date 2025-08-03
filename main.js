import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import StateManager from './utils/stateManager.js';
import { fileURLToPath } from 'url';

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
let serverProcess;
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
        icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: add an icon
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
    
    // Start the Node.js server with environment variable for last playlist
    const env = { ...process.env };
    if (lastPlaylist) {
        env.LAST_PLAYLIST = lastPlaylist;
    }
    
    serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        stdio: 'inherit',
        env: env
    });

    // Wait for server to be ready
    await waitForServer('http://localhost:3000', 30000);
    
    console.log('Server ready, opening Electron window...');
    createWindow();
    createMenu();
}

// Wait for server to respond
function waitForServer(url, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        async function checkServer() {
            const http = await import('http');
            const request = http.default.get(url, (res) => {
                resolve();
            });
            
            request.on('error', () => {
                if (Date.now() - startTime > timeout) {
                    reject(new Error('Server startup timeout'));
                } else {
                    setTimeout(checkServer, 500);
                }
            });
        }
        
        checkServer();
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
    // Kill the server process
    if (serverProcess) {
        serverProcess.kill();
    }
    
    // On macOS, applications stay active until explicitly quit
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle app quit
app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
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