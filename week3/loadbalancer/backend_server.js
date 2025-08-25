const express = require('express');
const app = express();

const port = process.argv[2] || 8001;

// Middleware to allow access only from load balancer (localhost:8000)
app.use((req, res, next) => {
    // Only allow requests from 127.0.0.1 and originating load balancer port 8000
    // For HTTP, remotePort is the client port; can't check it directly with Express,
    // but we can restrict to same host (localhost).
    // If you want stricter checks, handle via network firewall.
    if (req.ip === '127.0.0.1' || req.ip === '::1') {
        next();
    } else {
        res.status(403).send('Forbidden: Backend accessible only via load balancer');
    }
});

// /api route (GET only)
app.get('/api', (req, res) => {
    console.log("Hello from backend")
    res.json({ port, msg: 'Hello from backend' });
});

// 404 handler for anything else
app.use((req, res) => {
    res.status(404).send('Not found');
});

// Start backend server on provided port
app.listen(port, '127.0.0.1', () => { // Only bind to localhost interface
    console.log(`Express backend server running on 127.0.0.1:${port} (local access only)`);
});
