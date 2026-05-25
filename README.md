# 🎵 OBSonic

<div align="center">

**A highly customizable music player designed for streamers**

Perfect for OBS streaming setups with remote control functionality and a built-in style editor

![Demo](https://i.imgur.com/mH4t9tY.gif)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?logo=electron)](https://www.electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)](https://nodejs.org/)

[Features](#-features) • [Quick Start](#-quick-start) • [Usage](#-usage) • [Development](#-development) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🎮 **Streaming Integration**
- **OBS Browser Source Ready** - Seamless integration with OBS Studio and other streaming software
- **Transparent Background Support** - Clean overlay that blends perfectly with your stream
- **Dual Interface System** - Separate player and remote control interfaces
- **Audio Control** - Optional OBS audio control for better volume management

### 🎨 **Customization**
- **Built-in Code Editor** - Live editor with Monaco (VSCode's editor) for real-time customization
- **Three Resizable Panes** - Player preview, file browser, and code editor with drag-to-resize functionality
- **Framework-Free HTML/CSS/JS** - Easy to customize without complex build processes
- **Syntax Highlighting** - Full IDE experience for editing player styles and behavior
- **Live Preview** - See your changes instantly in the preview pane
- **Unsaved Change Indicators** - VS Code-style `●` dot on modified files, preserved across file switches
- **Save All** - Save every modified file at once with one click or `Ctrl+Shift+S`

### 🎵 **Playlist Management**
- **Multiple Playlists** - Organize your music by mood, genre, or stream theme
- **Smart Shuffle** - Random playback with no repeats until all songs are played
- **Folder-Based System** - Simple drag-and-drop playlist creation
- **Automatic Metadata** - Extracts ID3 tags from MP3 files (title, artist, album art)
- **Instant Switching** - Change playlists on-the-fly from the remote

### 🎛️ **Remote Control**
- **Touch-Friendly Interface** - Control from phone, tablet, or secondary device
- **Real-Time Sync** - WebSocket-based instant communication
- **Multiple Connections** - Connect unlimited remote controls simultaneously
- **Playback Controls** - Play, pause, next, previous, restart
- **Status Display** - Current song and connection status at a glance

### 📡 **Third-Party REST API**
- **HTTP Control** - Any tool (Stream Deck plugins, scripts, dashboards) can control OBSonic via REST
- **Swagger UI** - Interactive API documentation at `/api/docs` with live "Try it out" support
- **Localhost Only** - API is restricted to loopback for security
- **Socket.io sync** - Every REST call also broadcasts a `state-update` to all connected clients
- **Full endpoint coverage** - Play, pause, next, previous, restart, switch playlist, get state

### 💻 **Developer Experience**
- **Cross-Platform** - Windows, macOS, and Linux support
- **Built with Electron** - Native desktop application
- **Hot Reload** - Development mode with automatic restart
- **Clean Architecture** - Well-organized codebase with utilities separation

---

## 📸 Screenshots

<div align="center">

| Player Interface | Remote Control | Code Editor |
|:---:|:---:|:---:|
| Clean, minimal display | Touch-friendly controls | Live editing environment |

*Screenshots coming soon*

</div>

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MP3 music files

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YoannBureau/OBSonic.git
   cd OBSonic
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Launch OBSonic**
   ```bash
   npm start
   ```

4. **Click "Playlists folder" button, then drag your MP3 files in your playlist folders**

### OBS Setup

1. **Access the player**
   - Click **"Player link"** button in the remote control
   - The player URL will be copied to your clipboard

2. **Add to OBS**
   - In OBS Studio, add a new **Browser Source**
   - Paste the copied URL
   - Set dimensions (recommended: 1920x1080 or your stream resolution)
   - ✅ Check "Control audio via OBS" for better audio management

3. **Start streaming**
   - Use the remote control to manage playback
   - Customize the player appearance in the built-in editor

---

## 📖 Usage

### 🎵 Music Player (`/player`)

The player interface is designed to be clean and unobtrusive:

- **Automatic Playback** - Songs play automatically when started
- **Album Art Display** - Shows cover art from MP3 metadata
- **Song Information** - Title and artist displayed beautifully
- **Auto-Advance** - Automatically moves to next song when finished
- **Customizable UI** - Edit HTML, CSS, and JS directly in the app

### 🎛️ Remote Control (Electron app, or `/remote`)

Control your music from anywhere:

- **Playlist Selector** - Dropdown menu to switch playlists instantly
- **Playback Buttons**:
  - ⏮️ **Previous** - Go to previous song
  - 🔁 **Restart** - Restart current song
  - ▶️/⏸️ **Play/Pause** - Toggle playback
  - ⏭️ **Next** - Skip to next random song
- **Real-Time Status** - Current song and connection state
- **📁 Playlists folder** - Open your playlists directory in Explorer/Finder
- **📋 Player link** - Copy player URL to clipboard for OBS
- **📺 Player Editor** - Open the built-in code editor window
- **📡 API Docs** - Open the interactive REST API documentation

### 🛠️ Code Editor (Electron app, or `/editor`)

Built-in development environment:

- **File Browser** - Navigate player files (HTML, CSS, JS)
- **Monaco Editor** - Full VSCode editor with syntax highlighting
- **Unsaved Change Tracking** - `●` dot appears on modified files (VS Code-style), edits are preserved in memory when switching between files
- **Save** - Save current file with `Ctrl+S` (`Cmd+S` on Mac)
- **Save All** - Save all modified files at once with the **Save All** button or `Ctrl+Shift+S`
- **Toast Notifications** - Non-intrusive save confirmations at the bottom of the screen
- **Live Preview** - See changes in real-time
- **Resizable Panes** - Drag dividers to adjust layout
- **Syntax Support** - JavaScript, HTML, CSS, and JSON

### 📡 REST API (`/api/...`)

Control OBSonic from any third-party tool over HTTP (localhost only):

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/state` | Full current playback state |
| `GET` | `/api/playlists` | List all available playlists |
| `POST` | `/api/play` | Resume playback |
| `POST` | `/api/pause` | Pause playback |
| `POST` | `/api/next` | Skip to next song |
| `POST` | `/api/previous` | Go to previous song |
| `POST` | `/api/restart` | Restart current song |
| `POST` | `/api/playlist` | Switch playlist — body: `{ "name": "Lofi" }` |
| `GET` | `/api/docs` | Interactive Swagger UI documentation |

```bash
# Example: skip to next song
curl -X POST http://localhost:3000/api/next

# Example: switch playlist
curl -X POST http://localhost:3000/api/playlist \
  -H "Content-Type: application/json" \
  -d '{"name": "Synthwave"}'
```

All mutating endpoints automatically broadcast a `state-update` Socket.io event to keep all connected clients (remote, player) in sync.

---

## 🏗️ Development

### Development Lifecycle

OBSonic follows a streamlined development process:

#### **Local Development**

```bash
# Development mode with auto-restart
npm run dev

# Regular start
npm start
```

- **Hot Reload**: Server automatically restarts on file changes in dev mode
- **Live Editing**: Use the built-in editor for real-time player customization
- **Instant Preview**: Changes reflect immediately in the preview pane

#### **Building for Distribution**

```bash
# Build for Windows
npm run build-win          # Installer
npm run build-win-portable # Portable executable

# Build for macOS
npm run build-mac          # Universal build
npm run build-mac-dmg      # DMG installer
npm run build-mac-zip      # ZIP archive

# Build for all platforms
npm run dist-all
```

**Build outputs** are located in the `dist/` directory.

#### **Project Architecture**

```
OBSonic/
├── main.js                      # Electron main process & Express server
├── package.json                 # Project configuration & dependencies
│
├── public/                      # Frontend interfaces
│   ├── player/                  # Music player interface (OBS widget)
│   │   ├── player.html          # Player layout
│   │   ├── player.css           # Player styling
│   │   └── player.js            # Player logic & audio engine
│   │
│   ├── remote/                  # Remote control interface
│   │   ├── remote.html          # Remote layout
│   │   ├── remote.css           # Remote styling
│   │   └── remote.js            # Remote logic
│   │
│   ├── editor/                  # Built-in code editor
│   │   ├── editor.html          # Editor layout
│   │   ├── editor.css           # Editor styling
│   │   ├── editor.js            # Editor logic (per-file dirty tracking)
│   │   └── libs/                # Monaco editor files
│   │
│   ├── docs/                    # API documentation
│   │   ├── index.html           # Swagger UI page
│   │   └── openapi.json         # OpenAPI 3.0 spec (generated at startup)
│   │
│   └── assets/                  # Icons and images
│
├── utils/                       # Backend utilities
│   ├── musicManager.js          # Playlist & playback management
│   ├── stateManager.js          # Application state persistence
│   ├── network.js               # Port detection utilities
│   └── apiRoutes.js             # Third-party REST API routes & OpenAPI spec writer
│
└── playlists/                   # Music library (user-managed)
    ├── Synthwave/               # Example playlist
    ├── Lofi/                    # Example playlist
    └── README.md                # Playlist setup guide
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop App** | Electron 28 | Cross-platform native application |
| **Backend** | Express.js | HTTP server for interfaces & REST API |
| **Real-time** | Socket.io | WebSocket communication |
| **Frontend** | Vanilla JS | No framework dependencies |
| **Editor** | Monaco Editor | VSCode's editor for code editing |
| **UI Components** | Split.js | Resizable panes |
| **Storage** | Electron Store | Persistent state management |
| **Metadata** | music-metadata | MP3 ID3 tag extraction |
| **API Docs** | Swagger UI (CDN) | Interactive REST API documentation |

### Key Components

#### **API Routes** (`utils/apiRoutes.js`)
- Registers all public REST API endpoints under `/api/`
- Applies localhost-only and CORS middleware per-router
- Generates and writes `openapi.json` at startup with the dynamic port

#### **Music Manager** (`utils/musicManager.js`)
- Scans playlist directories
- Extracts MP3 metadata
- Manages playback queue
- Handles shuffle logic without repeats

#### **State Manager** (`utils/stateManager.js`)
- Persists application state
- Saves current playlist and playback position
- Restores state on app restart

#### **Network Utilities** (`utils/network.js`)
- Finds available local port starting from 3000

---

## 🎯 Use Cases

### Perfect for:
- 🎮 **Twitch/YouTube Streamers** - Professional music overlay for streams
- 🎨 **Content Creators** - Background music with style
- 🏢 **Offices** - Shared music control system
- 🎉 **Events** - Remote-controlled music player
- 💻 **Developers** - Learning Electron and WebSocket development

---

## 🔧 Configuration

### Supported Audio Formats
- ✅ MP3 (.mp3)
- ❌ Other formats coming soon

### Default Ports
- **Web Server**: `3000`
- **WebSocket**: Same port (Socket.io)

### Customization Tips

1. **Styling the Player**
   - Open the **Player Editor** from the remote, or navigate to `/editor`
   - Edit `player.css` for visual changes
   - Modify `player.html` for layout changes
   - Update `player.js` for behavior changes
   - Unsaved files show a `●` dot — use **Save All** (`Ctrl+Shift+S`) to save everything at once

2. **Custom Album Art**
   - Ensure MP3 files have embedded album art
   - Or use proper ID3 tags with artwork

3. **Playlist Organization**
   - Use descriptive folder names (they become playlist names)
   - Keep similar music together
   - Remove empty folders (they won't show up)

4. **REST API Integration**
   - The API is available at `http://localhost:<port>/api/`
   - The port is auto-detected (default `3000`) and shown in the console on startup
   - Visit `/api/docs` for the full interactive Swagger documentation
   - All endpoints are localhost-only; CORS is open for any origin on the same machine

---

## 📋 Requirements

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, Linux
- **RAM**: 256 MB minimum
- **Storage**: 100 MB + music files
- **Node.js**: v14 or higher (for development)

### Browser Compatibility (for OBS)
- Chrome/Chromium-based sources (OBS Browser Source)
- Any modern browser for remote control

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Ways to Contribute
- 🐛 **Report Bugs** - Open an issue with details
- 💡 **Suggest Features** - Share your ideas
- 📝 **Improve Documentation** - Fix typos, add examples
- 🎨 **Submit Themes** - Share player customizations
- 💻 **Code Contributions** - Submit pull requests

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

### Code Style
- Use meaningful variable names
- Comment complex logic
- Follow existing code structure
- Test before submitting

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **No music playing** | Verify MP3 files exist in `playlists/` folders |
| **Connection issues** | Check port 3000 isn't blocked/in use |
| **Missing metadata** | Add proper ID3 tags to MP3 files |
| **Editor not loading** | Clear browser cache and restart app |
| **OBS shows blank** | Ensure "Control audio via OBS" is checked |
| **Remote not connecting** | Verify both devices are on same network |
| **API returns 403** | API is localhost-only — ensure requests originate from `127.0.0.1` |
| **Swagger shows wrong port** | Restart the app — `openapi.json` is regenerated at startup with the correct port |

### Getting Help
- 📖 Check [Issues](https://github.com/YoannBureau/OBSonic/issues) for similar problems
- 💬 Open a new issue with detailed information
- 🔍 Include error messages and steps to reproduce

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TL;DR**: You can use, modify, and distribute this project freely. Just keep the original license intact.

---

## 🙏 Acknowledgments

- **Monaco Editor** - VSCode's powerful editor
- **Split.js** - Resizable split panes
- **Socket.io** - Real-time WebSocket communication
- **Electron** - Cross-platform desktop framework
- **music-metadata** - MP3 metadata extraction
- **Swagger UI** - Interactive API documentation

---

## 🗺️ Roadmap

### Planned Features
- [ ] Support for more audio formats (FLAC, WAV, OGG)
- [ ] Volume control from remote
- [ ] Equalizer settings
- [ ] Playlist import/export
- [ ] Song search functionality
- [ ] Custom keyboard shortcuts
- [ ] Multiple theme presets
- [ ] Mobile app for remote control
- [ ] Cloud playlist sync
- [ ] API key authentication option for non-localhost access

### Long-term Goals
- Integration with Spotify/YouTube Music
- Advanced visualizations
- Plugin system for extensions
- Community theme marketplace

---

<div align="center">

**Made with ❤️ for streamers and music lovers**

[⬆ Back to Top](#-obsonic)

</div>
