import net from 'net';

function checkPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.listen(port, () => {
            server.once('close', () => {
                resolve(true);
            });
            server.close();
        });
        
        server.on('error', () => {
            resolve(false);
        });
    });
}

async function findAvailablePort(startPort = 3000, maxAttempts = 100) {
    for (let port = startPort; port < startPort + maxAttempts; port++) {
        const isAvailable = await checkPortAvailable(port);
        if (isAvailable) {
            return port;
        }
    }
    throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

export { checkPortAvailable, findAvailablePort };