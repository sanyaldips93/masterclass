const express = require('express');
const http = require('http');
const { pipeline } = require('stream');

const backendPorts = [8001, 8002, 8003, 8004];
let current = 0; // For round-robin load balancing

const app = express();

// Middleware to forward all incoming requests to backend servers
app.use((req, res) => {
    // Select backend port in round-robin fashion
    const port = backendPorts[current];
    current = (current + 1) % backendPorts.length;

    // Options for HTTP request to backend
    const options = {
        hostname: 'localhost', // Backend servers run on localhost
        port, // Selected backend port
        path: req.originalUrl, // Forward original URL (route + query)
        method: req.method,    // Same HTTP method
        headers: req.headers   // Forward headers
    };

    // Create request to backend
    const proxyReq = http.request(options, (proxyRes) => {
        // Set response headers and status code from backend
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        // Stream backend response directly to client
        pipeline(proxyRes, res, () => {});
    });

    // Error handler for backend connectivity issues
    proxyReq.on('error', (err) => {
        res.status(502).send('Bad Gateway');
    });

    // Stream incoming request body to backend
    pipeline(req, proxyReq, () => {});
});

// Start load balancer server on port 8000
app.listen(8000, () => {
    console.log('Express load balancer listening on port 8000');
});
