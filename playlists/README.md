# Playlists Directory

This directory contains your music playlists. Each subdirectory represents a different playlist.

## Structure

```
playlists/
├── Synthwave/          # Example playlist
│   ├── song1.mp3
│   ├── song2.mp3
│   └── ...
├── Chill/              # Another playlist
│   ├── track1.mp3
│   ├── track2.mp3
│   └── ...
└── YourPlaylist/       # Add your own playlists
    ├── music1.mp3
    └── ...
```

## Instructions

1. Create a new folder for each playlist you want
2. Add .mp3 files to each folder
3. The app will automatically detect and load them
4. Playlists are sorted alphabetically
5. The first playlist alphabetically will start playing automatically

## Supported Formats

- Only .mp3 files are supported
- The app will read ID3 tags for song information (title, artist, album art)
- If tags are missing, it will use the filename as the title

## Example Playlists

Two example playlist folders have been created for you:
- `Synthwave/` - Add your synthwave music here
- `Chill/` - Add your chill/ambient music here

Simply add your .mp3 files to these directories or create new ones!