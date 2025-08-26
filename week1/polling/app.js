// app.js — Edited with controllable delay/failure and cancel support
const express = require("express");
const app = express();
app.use(express.json());

const tasks = {}; // { id: { status: "pending" | "running" | "failed" | "cancelled" } }

// Mock EC2 creation with optional delay & fail
// Example: /create?delay=7000&fail=1
app.post("/create", (req, res) => {
  const id = Date.now().toString();
  tasks[id] = { status: "pending" };

  const delay = parseInt(req.query.delay || "60000", 10);
  const shouldFail = req.query.fail === "1";

  setTimeout(() => {
    if (tasks[id].status === "pending") {
      tasks[id].status = shouldFail ? "failed" : "running";
    }
  }, delay);

  res.json({ id, status: "pending", delay, willFail: shouldFail });
});

/**
 * Short Polling API
 * Client keeps calling until status == running/failed/cancelled
 */
app.get("/status/:id", (req, res) => {
  const task = tasks[req.params.id];
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json({ id: req.params.id, status: task.status });
});

/**
 * Long Polling API
 * Keeps request open until status != pending or timeout (default 30s)
 */
app.get("/status-long/:id", (req, res) => {
  const task = tasks[req.params.id];
  if (!task) return res.status(404).json({ error: "Not found" });

  if (task.status !== "pending") {
    return res.json({ id: req.params.id, status: task.status });
  }

  const startTime = Date.now();
  let checks = 0;
  let totalCpu = 0;

  const check = () => {
    const u0 = process.cpuUsage();
    checks++;

    if (task.status !== "pending") {
      clearInterval(interval);
      clearTimeout(timeout);

      const usage = process.cpuUsage(u0);
      totalCpu += usage.user + usage.system;

      const elapsed = Date.now() - startTime;
      console.log(`[LONG POLL] checks=${checks}, avgCPU=${(totalCpu / checks).toFixed(2)}µs, CPU%=${((totalCpu / 1000) / elapsed * 100).toFixed(2)}%`);

      return res.json({ id: req.params.id, status: task.status });
    }

    const usage = process.cpuUsage(u0);
    totalCpu += usage.user + usage.system;
  };

  const interval = setInterval(check, 10); // change 50 → 100 to compare
  const timeout = setTimeout(() => {
    clearInterval(interval);
    const elapsed = Date.now() - startTime;
    console.log(`[LONG POLL] timeout after ${elapsed}ms, checks=${checks}`);
    res.json({ id: req.params.id, status: task.status });
  }, 70000);
});

// Cancel a task
app.post("/cancel/:id", (req, res) => {
  const task = tasks[req.params.id];
  if (!task) return res.status(404).json({ error: "Not found" });
  task.status = "cancelled";
  res.json({ id: req.params.id, status: task.status });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
