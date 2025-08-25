const { spawn } = require('child_process');

// Ports for all backend servers
const ports = [8001, 8002, 8003, 8004];

// Spawn one backend server process per port
ports.forEach(port => {
    const child = spawn('node', ['backend_server.js', port]);

    child.stdout.on('data', (data) => {
        console.log(`[Backend ${port}] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`[Backend ${port} ERROR] ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
        console.log(`[Backend ${port}] exited with code ${code}`);
    });
});
