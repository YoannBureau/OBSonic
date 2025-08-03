const fs = require('fs');
const path = require('path');
const os = require('os');

// Create a state file in the user data directory
const stateFilePath = path.join(os.homedir(), '.obs-playlist-player-state.json');

class StateManager {
    static saveLastPlaylist(playlistName) {
        try {
            let state = {};
            
            // Try to read existing state
            if (fs.existsSync(stateFilePath)) {
                const data = fs.readFileSync(stateFilePath, 'utf8');
                state = JSON.parse(data);
            }
            
            // Update the last playlist
            state.lastPlaylist = playlistName;
            
            // Write back to file
            fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
            console.log(`Saved last playlist to state file: ${playlistName}`);
        } catch (error) {
            console.error('Error saving playlist state:', error);
        }
    }
    
    static getLastPlaylist() {
        try {
            if (fs.existsSync(stateFilePath)) {
                const data = fs.readFileSync(stateFilePath, 'utf8');
                const state = JSON.parse(data);
                return state.lastPlaylist || null;
            }
        } catch (error) {
            console.error('Error reading playlist state:', error);
        }
        return null;
    }
}

module.exports = StateManager;