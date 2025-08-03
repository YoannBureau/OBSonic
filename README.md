# OBS Playlist Player

A simple MP3 playlist player with remote control functionality, perfect for OBS streaming or any scenario where you need separate player and control interfaces.

## Features

- **Dual Interface**: Separate music player and remote control pages
- **Smart Playback**: Random song selection with no repeats until all songs are played
- **Real-time Control**: Remote controls affect the player instantly
- **Multiple Playlists**: Easy playlist switching from the remote
- **Clean Display**: Simple, distraction-free music player interface
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Add Your Music**
   - Create folders in the `playlists/` directory
   - Add .mp3 files to each playlist folder
   - Example: `playlists/Synthwave/song1.mp3`

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Open the Interfaces**
   - Music Player: `http://localhost:3000/player`
   - Remote Control: `http://localhost:3000/remote`

## How It Works

### Music Player (`/player`)
- Displays current song title, artist, and album art
- Plays music automatically
- Clean, minimal interface perfect for OBS overlays
- Auto-advances to next random song when current song ends

### Remote Control (`/remote`)
- Control playlist selection
- Play/pause, next, previous, restart controls
- Real-time status display
- Compact, touch-friendly interface

### Playlist Management
- Each folder in `playlists/` becomes a playlist
- Songs play randomly without repeats
- When all songs are played, the cycle resets
- Automatic metadata extraction from MP3 files

## Directory Structure

```
obs-playlist-player/
├── server.js                 # Main server file
├── package.json              # Dependencies
├── public/                   # Web interface files
│   ├── player.html           # Music player page
│   ├── remote.html           # Remote control page
│   ├── css/                  # Stylesheets
│   │   ├── player.css
│   │   └── remote.css
│   └── js/                   # JavaScript files
│       ├── player.js
│       └── remote.js
├── utils/                    # Backend utilities
│   └── musicManager.js       # Music management logic
└── playlists/                # Your music folders
    ├── Synthwave/            # Example playlist
    ├── Chill/                # Example playlist
    └── README.md             # Playlist instructions
```

## Remote Control Features

- **Playlist Switching**: Dropdown to select and switch playlists instantly
- **Playback Controls**:
  - ⏮️ Previous song
  - ⏪ Restart current song
  - ▶️/⏸️ Play/Pause
  - ⏭️ Next song
- **Status Display**: Shows current song and playback state
- **Connection Status**: Visual indicator of server connection

## Technical Details

- **Backend**: Node.js with Express and Socket.io
- **Frontend**: Vanilla HTML, CSS, and JavaScript
- **Real-time Communication**: WebSocket-based for instant updates
- **Audio Metadata**: Automatic extraction from MP3 ID3 tags
- **Supported Formats**: MP3 files only

## Development

For development with auto-restart:
```bash
npm run dev
```

## Usage Tips

1. **For OBS**: Open the player page in a browser source
2. **For Control**: Use the remote page on your phone or secondary device
3. **Multiple Instances**: You can have multiple remote controls connected
4. **Playlist Organization**: Name your playlist folders descriptively
5. **File Naming**: Use proper ID3 tags for best results, or clean filenames

## Troubleshooting

- **No music playing**: Check that MP3 files are in the playlists directory
- **Connection issues**: Ensure port 3000 is available
- **Metadata missing**: Verify MP3 files have proper ID3 tags
- **Page not loading**: Check that the server is running

## License

MIT License - Feel free to modify and use as needed!