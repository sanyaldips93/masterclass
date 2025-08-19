import express from "express"; // Express framework to handle HTTP requests

const app = express();
const PORT = 8000;

// -----------------------------------------------------
// Serve HTML page (our frontend UI)
// -----------------------------------------------------
app.get("/", (req, res) => {
  // Send index.html file from project root
  res.sendFile(process.cwd() + "/index.html");
});

// -----------------------------------------------------
// Keep track of connected clients (SSE connections)
// -----------------------------------------------------
let clients = [];

// -----------------------------------------------------
// SSE endpoint (Server-Sent Events)
// Clients will connect here to receive log updates
// -----------------------------------------------------
app.get("/events", (req, res) => {
  // Required headers for SSE to work properly
  res.setHeader("Content-Type", "text/event-stream"); // Data will be a stream
  res.setHeader("Cache-Control", "no-cache"); // Prevent browser caching
  res.setHeader("Connection", "keep-alive"); // Keep connection open
  res.flushHeaders(); // Actually send headers immediately

  // Store this client (the response object is the stream)
  clients.push(res);

  // When the client disconnects, remove from list
  req.on("close", () => {
    clients = clients.filter(c => c !== res);
  });
});

// -----------------------------------------------------
// Deployment trigger endpoint
// When the frontend hits /deploy, we simulate a deployment log stream
// -----------------------------------------------------
app.get("/deploy", (req, res) => {
  // Example deployment steps (can be as detailed as you want)
  const steps = [
    "Checking system requirements...",
    "Pulling source code from repository...",
    "Installing dependencies...",
    "Running tests...",
    "Building application...",
    "Creating Docker image...",
    "Pushing Docker image to registry...",
    "Updating Kubernetes manifests...",
    "Deploying pods...",
    "Waiting for pods to be ready...",
    "Deployment finished successfully ✅"
  ];

  let step = 0;

  // Interval will send a log every 1 second
  const interval = setInterval(() => {
    const log = `[${new Date().toLocaleTimeString()}] ${steps[step]}`;

    // Send this log line to ALL connected SSE clients
    clients.forEach(c => c.write(`data: ${log}\n\n`));

    step++;

    // Stop once all steps are sent
    if (step >= steps.length) {
      clearInterval(interval);
    }
  }, 1000);

  // Immediately respond to HTTP request (acknowledge deployment started)
  res.json({ status: "Deployment started" });
});

// -----------------------------------------------------
// Start server
// -----------------------------------------------------
app.listen(PORT, () => console.log(`SSE server running at http://localhost:${PORT}`));
