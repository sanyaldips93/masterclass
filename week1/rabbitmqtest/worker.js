// worker.js
//
// This worker listens to the RabbitMQ queue.
// - "create" action -> INSERT row
// - "upsert" action -> FAIL deliberately, to test retries & DLQ

import amqplib from "amqplib";
import db from "./db.js";

const RABBIT_URL = "amqp://user:pass@localhost:5672";
const QUEUE = "messagesv3";
const DLQ = "messagesv3.dlq"; // dead-letter queue

async function startWorker() {
  const conn = await amqplib.connect(RABBIT_URL);
  const channel = await conn.createChannel();

  // declare DLQ
  await channel.assertQueue(DLQ, { durable: true });

  // declare main queue with dead-letter-exchange to DLQ
  await channel.assertQueue(QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "dlx",
      "x-dead-letter-routing-key": DLQ
    }
  });

  console.log("Worker waiting for messages...");

  channel.consume(
    QUEUE,
    (msg) => {
      if (!msg) return;

      const data = JSON.parse(msg.content.toString());
      console.log("Consumed:", data);

      if (data.action === "create") {
        // Normal insert
        db.run(
          "INSERT INTO messages(type, payload) VALUES(?, ?)",
          ["post", JSON.stringify(data.payload)],
          (err) => {
            if (err) {
              console.error("DB Error (create):", err.message);
              channel.nack(msg, false, false); // requeue for retry
            } else {
              channel.ack(msg);
            }
          }
        );
      }

      if (data.action === "upsert") {
        // Simulate DB failure deliberately
        console.error("Simulated DB failure for PUT:", data.payload);

        // Option 1: retry (requeue back to same queue)
        // channel.nack(msg, false, true);

        // Option 2: dead-letter (send to DLQ, don't requeue)
        channel.reject(msg, false);
      }
    },
    { noAck: false }
  );
}

startWorker();
