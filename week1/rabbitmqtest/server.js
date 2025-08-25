// server.js
//
// This file runs an Express server that exposes 3 APIs:
// 1. POST /post -> publishes a "create" message to RabbitMQ
// 2. PUT /put   -> publishes an "upsert" message to RabbitMQ
// 3. GET /get   -> fetches records directly from SQLite (synchronous read)

import express from "express";
import amqplib from "amqplib";
import db from "./db.js";

const app = express();
app.use(express.json()); // parse JSON bodies

// RabbitMQ connection URL (matches docker-compose credentials)
const RABBIT_URL = "amqp://user:pass@localhost:5672";

// Queue name where messages are published
const QUEUE = "messagesv3";

let channel;

// ---------------------------
// Connect to RabbitMQ
// ---------------------------
async function connectRabbit() {
  const conn = await amqplib.connect(RABBIT_URL); // open TCP connection to RabbitMQ
  channel = await conn.createChannel();           // create a channel (virtual connection inside TCP)
  channel.assertQueue("messagesv3", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "dlx",
      "x-dead-letter-routing-key": "messagesv3.dlq"
    }
  }); // declare a durable queue (survives broker restart)
}
await connectRabbit();

// ---------------------------
// POST /post -> create (insert new row)
// ---------------------------
app.post("/post", async (req, res) => {
  // Wrap data with a message type "post"
  const msg = { action: "create", payload: req.body };

  // Send to RabbitMQ as Buffer (all messages are byte streams)
  channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(msg)), {
    persistent: true, // persist message to disk
  });

  res.json({ status: "queued", action: "create" });
});

// ---------------------------
// PUT /put -> upsert (insert or update row by type)
// ---------------------------
app.put("/put", async (req, res) => {
  const msg = { action: "upsert", payload: req.body };

  channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(msg)), {
    persistent: true,
  });

  res.json({ status: "queued", action: "upsert" });
});

// ---------------------------
// GET /get -> fetch all rows synchronously
// ---------------------------
app.get("/get", (req, res) => {
  db.all("SELECT * FROM messages", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start HTTP server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
