const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Keep a global reference of the window object
let mainWindow;
let serverProcess;

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
                    click: () => {
                        require('electron').shell.openExternal('http://localhost:3000/player');
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
    
    // Start the Node.js server
    serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        stdio: 'inherit'
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
        
        function checkServer() {
            const http = require('http');
            const request = http.get(url, (res) => {
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

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        // Open in default browser instead
        require('electron').shell.openExternal(navigationUrl);
    });
});

console.log('Electron app starting...');