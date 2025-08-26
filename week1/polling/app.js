// app.js
const express = require("express");
const app = express();
app.use(express.json());

const tasks = {}; // { id: { status: "pending" | "running" } }

// Mock EC2 creation
app.post("/create", (req, res) => {
  const id = Date.now().toString();
  tasks[id] = { status: "pending" };

  // Simulate async EC2 startup (5s)
  setTimeout(() => {
    tasks[id].status = "running";
  }, 10000);

  res.json({ id, status: "pending" });
});

/**
 * Short Polling API
 * Client keeps calling until status == running
 */
app.get("/status/:id", (req, res) => {
  const task = tasks[req.params.id];
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json({ id: req.params.id, status: task.status });
});

/**
 * Long Polling API
 * Keeps request open until status != pending or timeout (30s)
 */
app.get("/status-long/:id", (req, res) => {
  const task = tasks[req.params.id];
  if (!task) return res.status(404).json({ error: "Not found" });

  if (task.status !== "pending") {
    return res.json({ id: req.params.id, status: task.status });
  }

  const checkInterval = setInterval(() => {
    if (task.status !== "pending") {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      return res.json({ id: req.params.id, status: task.status });
    }
  }, 500);

  const timeout = setTimeout(() => {
    clearInterval(checkInterval);
    res.json({ id: req.params.id, status: "pending" });
  }, 30000);
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
