import express from "express";
import mysql from "mysql2/promise";
import fs from "fs";

const app = express();
const PORT = 3000;

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "pass@123",
  database: "local",
  connectionLimit: 10,
});

const LOG_FILE = "benchmark.log";
function hrMillis(start, end) {
  return Number(end - start) / 1e6;
}
function log(msg) {
  const line = `${new Date().toISOString()} | ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line); // always append
  console.log(line.trim()); // progress on console
}

app.post("/benchmark", async (_req, res) => {
  const conn = pool;
  log("=== Benchmark run started ===");

  const BATCH = 100000;
  const values = Array.from({ length: BATCH }, (_, i) => [i, `data_${i}`, 1]);

  // ===================== BASIC TABLES =====================
  await conn.query(`DROP TABLE IF EXISTS t_ondku`);
  await conn.query(`DROP TABLE IF EXISTS t_replace`);

  await conn.query(`
    CREATE TABLE t_ondku (
      id BIGINT PRIMARY KEY,
      payload VARCHAR(255),
      counter INT
    ) ENGINE=InnoDB;
  `);
  await conn.query(`
    CREATE TABLE t_replace (
      id BIGINT PRIMARY KEY,
      payload VARCHAR(255),
      counter INT
    ) ENGINE=InnoDB;
  `);

  // ODKU (basic)
  log("=== Benchmark run: ON DUPLICATE KEY UPDATE (no index) ===");
  let start = process.hrtime.bigint();
  await conn.query(`INSERT INTO t_ondku (id, payload, counter) VALUES ?`, [values]);
  let end = process.hrtime.bigint();
  log(`t_ondku | Initial insert ${BATCH} rows | elapsed_ms=${hrMillis(start, end)}`);

  start = process.hrtime.bigint();
  await conn.query(`
    INSERT INTO t_ondku (id, payload, counter)
    VALUES ?
    ON DUPLICATE KEY UPDATE payload=VALUES(payload), counter=VALUES(counter)
  `, [values]);
  end = process.hrtime.bigint();
  log(`t_ondku | Collision update ${BATCH} rows | elapsed_ms=${hrMillis(start, end)}`);

  // REPLACE (basic)
  log("=== Benchmark run: REPLACE INTO (no index) ===");
  start = process.hrtime.bigint();
  await conn.query(`INSERT INTO t_replace (id, payload, counter) VALUES ?`, [values]);
  end = process.hrtime.bigint();
  log(`t_replace | Initial insert ${BATCH} rows | elapsed_ms=${hrMillis(start, end)}`);

  start = process.hrtime.bigint();
  await conn.query(`REPLACE INTO t_replace (id, payload, counter) VALUES ?`, [values]);
  end = process.hrtime.bigint();
  log(`t_replace | Collision replace ${BATCH} rows | elapsed_ms=${hrMillis(start, end)}`);

  // ===================== INDEXED TABLES =====================
  await conn.query(`DROP TABLE IF EXISTS t_ondku_idx`);
  await conn.query(`DROP TABLE IF EXISTS t_replace_idx`);

  await conn.query(`
    CREATE TABLE t_ondku_idx (
      id BIGINT PRIMARY KEY,
      payload VARCHAR(255),
      counter INT,
      INDEX(payload)
    ) ENGINE=InnoDB;
  `);
  await conn.query(`
    CREATE TABLE t_replace_idx (
      id BIGINT PRIMARY KEY,
      payload VARCHAR(255),
      counter INT,
      INDEX(payload)
    ) ENGINE=InnoDB;
  `);

  // ODKU (indexed)
  log("=== Benchmark run: ON DUPLICATE KEY UPDATE (with index) ===");
  start = process.hrtime.bigint();
  await conn.query(`INSERT INTO t_ondku_idx (id, payload, counter) VALUES ?`, [values]);
  end = process.hrtime.bigint();
  log(`t_ondku_idx | Initial insert ${BATCH} rows | elapsed_ms=${hrMillis(start, end)}`);

  start = process.hrtime.bigint();
  await conn.query(`
    INSERT INTO t_ondku_idx (id, payload, counter)
    VALUES ?
    ON DUPLICATE KEY UPDATE payload=VALUES(payload), counter=VALUES(counter)
  `, [values]);
  end = process.hrtime.bigint();
  log(`t_ondku_idx | Collision update ${BATCH} rows | elapsed_ms=${hrMillis(start, end)}`);

  // REPLACE (indexed)
  log("=== Benchmark run: REPLACE INTO (with index) ===");
  start = process.hrtime.bigint();
  await conn.query(`INSERT INTO t_replace_idx (id, payload, counter) VALUES ?`, [values]);
  end = process.hrtime.bigint();
  log(`t_replace_idx | Initial insert ${BATCH} rows | elapsed_ms=${hrMillis(start, end)}`);

  start = process.hrtime.bigint();
  await conn.query(`REPLACE INTO t_replace_idx (id, payload, counter) VALUES ?`, [values]);
  end = process.hrtime.bigint();
  log(`t_replace_idx | Collision replace ${BATCH} rows | elapsed_ms=${hrMillis(start, end)}`);

  log("=== Benchmark run completed ===");
  log("=================================================================================");
  await conn.query(`DROP TABLE IF EXISTS t_ondku_idx`);
  await conn.query(`DROP TABLE IF EXISTS t_replace_idx`);

  res.json({ message: "Benchmark completed. Logs appended to benchmark.log" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
