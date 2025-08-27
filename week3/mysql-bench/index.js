import express from "express";
import mysql from "mysql2/promise";
import { log } from "./logger.js";
import { ensureTables, insertRows, randomSelects, deleteAll } from "./db-ops.js";
import { ensureNoIndex, createIndex } from "./indexer.js";

const app = express();
const PORT = 3000;

const DB_URI = "mysql://root:pass@123@localhost:3306/local";

async function getConn() {
  return mysql.createConnection(DB_URI);
}

async function runBenchmark(withIndex) {
  const conn = await getConn();
  try {
    await ensureTables(conn);

    for (const table of ["t_int", "t_varchar"]) {
      if (withIndex) {
        await ensureNoIndex(conn, table);
        await createIndex(conn, table);
        log(`${table} | Index created before inserts`);
      } else {
        await ensureNoIndex(conn, table);
        log(`${table} | Running without index`);
      }

      await insertRows(conn, table);
      await randomSelects(conn, table);
      await deleteAll(conn, table);
    }
  } finally {
    log("--------------------------------------------------------------------------------------------------------")
    await conn.end();
  }
}

// === ROUTES ===

app.get("/benchmark/no-index", async (req, res) => {
  log("=== Benchmark run: NO INDEX ===");
  runBenchmark(false);
  res.send("Benchmark (no index) completed. Check benchmark_results.txt");
});

app.get("/benchmark/indexed", async (req, res) => {
  log("=== Benchmark run: WITH INDEX ===");
  runBenchmark(true);
  res.send("Benchmark (with index) completed. Check benchmark_results.txt");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
