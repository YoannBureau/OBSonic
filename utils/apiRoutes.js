import express from 'express';
import fs from 'fs';
import path from 'path';

/**
 * Middleware: block all requests that do not originate from loopback (localhost).
 */
function localhostOnly(req, res, next) {
    const ip = req.socket.remoteAddress;
    // Accept IPv4 loopback, IPv6 loopback, and IPv4-mapped IPv6 loopback
    const isLoopback =
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip === '::ffff:127.0.0.1';

    if (!isLoopback) {
        return res.status(403).json({ error: 'Forbidden: localhost access only' });
    }
    next();
}

/**
 * Middleware: allow CORS from any origin so browser-based tools and extensions
 * running on the same machine can call the API without CORS errors.
 */
function corsAnyOrigin(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
}

/**
 * Helper: broadcast a state-update to all Socket.io clients and return the
 * current state as a JSON response.
 */
async function broadcastAndRespond(musicManager, io, res) {
    const state = await musicManager.getCurrentState();
    if (io) {
        io.emit('state-update', state);
    }
    res.json(state);
}

/**
 * Register all public third-party REST API routes on the given Express app.
 *
 * @param {import('express').Express} expressApp
 * @param {() => { musicManager: any, socketServer: any }} getAppState
 */
export function setupPublicApiRoutes(expressApp, getAppState) {
    const router = express.Router();

    // Apply shared middleware to every /api/* route
    router.use(corsAnyOrigin);
    router.use(localhostOnly);
    router.use(express.json());

    // -------------------------------------------------------------------------
    // GET /api/state
    // Returns the full current playback state.
    // -------------------------------------------------------------------------
    router.get('/state', async (req, res) => {
        try {
            const { musicManager } = getAppState();
            const state = await musicManager.getCurrentState();
            res.json(state);
        } catch (error) {
            console.error('[API] GET /state error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // -------------------------------------------------------------------------
    // GET /api/playlists
    // Returns an alphabetically sorted list of available playlist names.
    // (Keeps backward compatibility with the original route in main.js.)
    // -------------------------------------------------------------------------
    router.get('/playlists', async (req, res) => {
        try {
            const { musicManager } = getAppState();
            const playlists = await musicManager.getPlaylists();
            res.json(playlists);
        } catch (error) {
            console.error('[API] GET /playlists error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // -------------------------------------------------------------------------
    // GET /api/current-state
    // Alias kept for backward compatibility with internal editor/player clients.
    // -------------------------------------------------------------------------
    router.get('/current-state', async (req, res) => {
        try {
            const { musicManager } = getAppState();
            const state = await musicManager.getCurrentState();
            res.json(state);
        } catch (error) {
            console.error('[API] GET /current-state error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // -------------------------------------------------------------------------
    // POST /api/play
    // Resumes playback if paused or stopped.
    // -------------------------------------------------------------------------
    router.post('/play', async (req, res) => {
        try {
            const { musicManager, socketServer } = getAppState();
            if (!musicManager.currentSong) {
                return res.status(409).json({ error: 'No song loaded' });
            }
            musicManager.isPlaying = true;
            musicManager.isPaused = false;
            await broadcastAndRespond(musicManager, socketServer, res);
        } catch (error) {
            console.error('[API] POST /play error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // -------------------------------------------------------------------------
    // POST /api/pause
    // Pauses playback.
    // -------------------------------------------------------------------------
    router.post('/pause', async (req, res) => {
        try {
            const { musicManager, socketServer } = getAppState();
            if (!musicManager.currentSong) {
                return res.status(409).json({ error: 'No song loaded' });
            }
            await musicManager.togglePlayPause();
            await broadcastAndRespond(musicManager, socketServer, res);
        } catch (error) {
            console.error('[API] POST /pause error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // -------------------------------------------------------------------------
    // POST /api/next
    // Skips to the next song in the current playlist.
    // -------------------------------------------------------------------------
    router.post('/next', async (req, res) => {
        try {
            const { musicManager, socketServer } = getAppState();
            await musicManager.nextSong();
            await broadcastAndRespond(musicManager, socketServer, res);
        } catch (error) {
            console.error('[API] POST /next error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // -------------------------------------------------------------------------
    // POST /api/previous
    // Goes back to the previous song in the current playlist.
    // -------------------------------------------------------------------------
    router.post('/previous', async (req, res) => {
        try {
            const { musicManager, socketServer } = getAppState();
            await musicManager.previousSong();
            await broadcastAndRespond(musicManager, socketServer, res);
        } catch (error) {
            console.error('[API] POST /previous error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // -------------------------------------------------------------------------
    // POST /api/restart
    // Restarts the currently playing song from the beginning.
    // -------------------------------------------------------------------------
    router.post('/restart', async (req, res) => {
        try {
            const { musicManager, socketServer } = getAppState();
            await musicManager.restartCurrentSong();
            await broadcastAndRespond(musicManager, socketServer, res);
        } catch (error) {
            console.error('[API] POST /restart error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // -------------------------------------------------------------------------
    // POST /api/playlist
    // Switches to the specified playlist.
    // Body: { "name": "Lofi" }
    // -------------------------------------------------------------------------
    router.post('/playlist', async (req, res) => {
        try {
            const { musicManager, socketServer } = getAppState();
            const { name } = req.body || {};
            if (!name || typeof name !== 'string') {
                return res.status(400).json({ error: 'Request body must include a "name" string field' });
            }
            await musicManager.switchPlaylist(name);
            await broadcastAndRespond(musicManager, socketServer, res);
        } catch (error) {
            console.error('[API] POST /playlist error:', error);
            // switchPlaylist throws if the playlist doesn't exist
            res.status(404).json({ error: error.message });
        }
    });

    // Mount the router under /api
    expressApp.use('/api', router);
}

/**
 * Generate and write the OpenAPI 3.0 spec to public/docs/openapi.json
 * so that the Swagger UI can load it at runtime (including the correct port).
 *
 * @param {string} publicDir   Absolute path to the public/ directory.
 * @param {number} port        The port the server is currently listening on.
 */
export function writeOpenApiSpec(publicDir, port) {
    const spec = {
        openapi: '3.0.3',
        info: {
            title: 'OBSonic API',
            version: '1.0.0',
            description:
                'REST API for third-party control of OBSonic — a music player designed for streaming setups.\n\n' +
                '> **Note:** All endpoints are restricted to localhost. CORS is open for any origin on the same machine.',
            contact: { name: 'OBSonic' }
        },
        servers: [{ url: `http://localhost:${port}`, description: 'Local OBSonic server' }],
        tags: [
            { name: 'Playback', description: 'Control music playback' },
            { name: 'Playlists', description: 'Query and switch playlists' },
            { name: 'State', description: 'Query current player state' }
        ],
        paths: {
            '/api/state': {
                get: {
                    tags: ['State'],
                    summary: 'Get full playback state',
                    description: 'Returns the complete current state: current song, playlist, play/pause status, and list of all playlists.',
                    operationId: 'getState',
                    responses: {
                        200: { description: 'Current state', content: { 'application/json': { schema: { $ref: '#/components/schemas/State' } } } },
                        500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                    }
                }
            },
            '/api/playlists': {
                get: {
                    tags: ['Playlists'],
                    summary: 'List all playlists',
                    description: 'Returns an alphabetically sorted array of playlist names detected in the playlists directory.',
                    operationId: 'getPlaylists',
                    responses: {
                        200: {
                            description: 'Array of playlist names',
                            content: { 'application/json': { schema: { type: 'array', items: { type: 'string' }, example: ['Fantasy', 'Lofi', 'Synthwave'] } } }
                        },
                        500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                    }
                }
            },
            '/api/playlist': {
                post: {
                    tags: ['Playlists'],
                    summary: 'Switch playlist',
                    description: 'Switches the active playlist. Triggers a shuffle and emits a state-update to all connected clients.',
                    operationId: 'switchPlaylist',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/PlaylistRequest' } } }
                    },
                    responses: {
                        200: { description: 'Updated state after switch', content: { 'application/json': { schema: { $ref: '#/components/schemas/State' } } } },
                        400: { description: 'Missing or invalid request body', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                        404: { description: 'Playlist not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                        500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                    }
                }
            },
            '/api/play': {
                post: {
                    tags: ['Playback'],
                    summary: 'Resume playback',
                    description: 'Resumes playback if paused or stopped. Has no effect if already playing.',
                    operationId: 'play',
                    responses: {
                        200: { description: 'Updated state', content: { 'application/json': { schema: { $ref: '#/components/schemas/State' } } } },
                        409: { description: 'No song is loaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                        500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                    }
                }
            },
            '/api/pause': {
                post: {
                    tags: ['Playback'],
                    summary: 'Pause playback',
                    description: 'Pauses the currently playing song. Toggles the pause state.',
                    operationId: 'pause',
                    responses: {
                        200: { description: 'Updated state', content: { 'application/json': { schema: { $ref: '#/components/schemas/State' } } } },
                        409: { description: 'No song is loaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                        500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                    }
                }
            },
            '/api/next': {
                post: {
                    tags: ['Playback'],
                    summary: 'Skip to next song',
                    description: 'Advances to the next track in the shuffled playlist. Re-shuffles and resets when all songs have been played.',
                    operationId: 'nextSong',
                    responses: {
                        200: { description: 'Updated state', content: { 'application/json': { schema: { $ref: '#/components/schemas/State' } } } },
                        500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                    }
                }
            },
            '/api/previous': {
                post: {
                    tags: ['Playback'],
                    summary: 'Go to previous song',
                    description: 'Goes back to the previous track in the shuffled playlist.',
                    operationId: 'previousSong',
                    responses: {
                        200: { description: 'Updated state', content: { 'application/json': { schema: { $ref: '#/components/schemas/State' } } } },
                        500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                    }
                }
            },
            '/api/restart': {
                post: {
                    tags: ['Playback'],
                    summary: 'Restart current song',
                    description: 'Restarts the current song from the beginning.',
                    operationId: 'restartSong',
                    responses: {
                        200: { description: 'Updated state', content: { 'application/json': { schema: { $ref: '#/components/schemas/State' } } } },
                        500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                    }
                }
            }
        },
        components: {
            schemas: {
                Song: {
                    type: 'object',
                    properties: {
                        filename: { type: 'string', example: 'song.mp3' },
                        title: { type: 'string', example: 'My Song' },
                        artist: { type: 'string', example: 'Artist Name' },
                        album: { type: 'string', example: 'Album Name' },
                        duration: { type: 'number', example: 213.4 },
                        relativePath: { type: 'string', example: 'Lofi/song.mp3' },
                        picture: {
                            nullable: true,
                            type: 'object',
                            properties: {
                                format: { type: 'string', example: 'image/jpeg' },
                                data: { type: 'string', description: 'Base64-encoded album art' }
                            }
                        }
                    }
                },
                State: {
                    type: 'object',
                    properties: {
                        currentPlaylist: { type: 'string', nullable: true, example: 'Lofi' },
                        currentSong: { $ref: '#/components/schemas/Song', nullable: true },
                        isPlaying: { type: 'boolean', example: true },
                        isPaused: { type: 'boolean', example: false },
                        shouldRestart: { type: 'boolean', example: false },
                        playlists: { type: 'array', items: { type: 'string' }, example: ['Fantasy', 'Lofi', 'Synthwave'] },
                        playedSongs: { type: 'array', items: { type: 'string' }, example: ['track1.mp3', 'track2.mp3'] },
                        totalSongs: { type: 'integer', example: 12 }
                    }
                },
                PlaylistRequest: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: { type: 'string', example: 'Lofi' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Playlist "Unknown" not found' }
                    }
                }
            }
        }
    };

    const docsDir = path.join(publicDir, 'docs');
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }

    const specPath = path.join(docsDir, 'openapi.json');
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf8');
    console.log(`OpenAPI spec written to ${specPath}`);
}
