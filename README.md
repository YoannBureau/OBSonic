# 🎵 OBSonic

<div align="center">

**A highly customizable music player designed for streamers**

Perfect for OBS streaming setups with remote control functionality and a built-in style editor

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

4. **Click "Open playlists" button, then drag your MP3 files in your playlist folders**

### OBS Setup

1. **Access the player**
   - Click "Copy link" button in the remote control
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
- **Copy Link** - Quick button to copy player URL for OBS

### 🛠️ Code Editor (Electron app, or `/editor`)

Built-in development environment:

- **File Browser** - Navigate player files (HTML, CSS, JS)
- **Monaco Editor** - Full VSCode editor with syntax highlighting
- **Live Preview** - See changes in real-time
- **Resizable Panes** - Drag dividers to adjust layout
- **Auto-Save** - Save with Ctrl+S (Cmd+S on Mac)
- **Syntax Support** - JavaScript, HTML, CSS, and JSON

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
│   ├── player/                  # Music player interface
│   │   ├── player.html          # Player layout
│   │   ├── player.css           # Player styling
│   │   └── player.js            # Player logic
│   │
│   ├── remote/                  # Remote control interface
│   │   ├── remote.html          # Remote layout
│   │   ├── remote.css           # Remote styling
│   │   └── remote.js            # Remote logic
│   │
│   ├── editor/                  # Built-in code editor
│   │   ├── editor.html          # Editor layout
│   │   ├── editor.css           # Editor styling
│   │   ├── editor.js            # Editor logic
│   │   └── libs/                # Monaco editor files
│   │
│   └── assets/                  # Icons and images
│
├── utils/                       # Backend utilities
│   ├── musicManager.js          # Playlist & playback management
│   ├── stateManager.js          # Application state persistence
│   └── network.js               # Network utilities
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
| **Backend** | Express.js | HTTP server for interfaces |
| **Real-time** | Socket.io | WebSocket communication |
| **Frontend** | Vanilla JS | No framework dependencies |
| **Editor** | Monaco Editor | VSCode's editor for code editing |
| **UI Components** | Split.js | Resizable panes |
| **Storage** | Electron Store | Persistent state management |
| **Metadata** | music-metadata | MP3 ID3 tag extraction |

### Key Components

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
- Detects local IP addresses
- Generates player URLs for OBS

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
   - Open `/editor` in the app
   - Edit `player.css` for visual changes
   - Modify `player.html` for layout changes
   - Update `player.js` for behavior changes

2. **Custom Album Art**
   - Ensure MP3 files have embedded album art
   - Or use proper ID3 tags with artwork

3. **Playlist Organization**
   - Use descriptive folder names (they become playlist names)
   - Keep similar music together
   - Remove empty folders (they won't show up)

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
