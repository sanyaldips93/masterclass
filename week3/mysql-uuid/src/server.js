import express from 'express';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import fs from 'fs';

const app = express();
const PORT = 3000;

const DB_URL = "mysql://root:pass@123@localhost:3306/local";

let pool;
async function initDb() {
  pool = await mysql.createPool(DB_URL);

  await pool.query(`DROP TABLE IF EXISTS users_int`);
  await pool.query(`DROP TABLE IF EXISTS users_uuid`);

  await pool.query(`
    CREATE TABLE users_int (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seq INT UNSIGNED NOT NULL UNIQUE,
      age INT NOT NULL
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE users_uuid (
      id CHAR(36) NOT NULL PRIMARY KEY,
      seq INT UNSIGNED NOT NULL UNIQUE,
      age INT NOT NULL
    ) ENGINE=InnoDB;
  `);

  await q('CREATE INDEX id_int ON users_int(id)');
  await q('CREATE INDEX id_uuid ON users_uuid(id)');
}

async function q(sql, params) {
  return pool.query(sql, params);
}

// Insert benchmark
app.get('/insert', async (req, res) => {
  const rows = 1_000_000;
  const batch = 10_000;

  let intStart = Date.now();
  for (let i = 0; i < rows; i += batch) {
    const n = Math.min(batch, rows - i);

    // INT table
    const intVals = [];
    const intParams = [];
    for (let j = 0; j < n; j++) {
      const seq = i + j + 1;
      intVals.push('(?, ?)');
      intParams.push(seq, Math.floor(Math.random() * 80) + 10);
    }
    await q(`INSERT INTO users_int (seq, age) VALUES ${intVals.join(',')}`, intParams);
  }
  let intMs = Date.now() - intStart;

  let uuidStart = Date.now();
  for (let i = 0; i < rows; i += batch) {
    const n = Math.min(batch, rows - i);

    // UUID table
    const uuidVals = [];
    const uuidParams = [];
    for (let j = 0; j < n; j++) {
      const seq = i + j + 1;
      uuidVals.push('(?, ?, ?)');
      uuidParams.push(crypto.randomUUID(), seq, Math.floor(Math.random() * 80) + 10);
    }
    await q(`INSERT INTO users_uuid (id, seq, age) VALUES ${uuidVals.join(',')}`, uuidParams);
  }
  let uuidMs = Date.now() - uuidStart;

  fs.appendFileSync(
    'benchmarks.txt',
    `Inserted ${rows} rows -> users_int: ${intMs} ms, users_uuid: ${uuidMs} ms\n`
  );

  res.json({ inserted: rows, intMs, uuidMs });
});

// Read benchmark
app.get('/read', async (req, res) => {
  const single = 100000;

  const [[{ cnt }]] = await q('SELECT COUNT(*) AS cnt FROM users_int');

  const out = {};

  // INT lookups
  let t0 = Date.now();
  for (let i = 0; i < single; i++) {
    const seq = Math.floor(Math.random() * cnt) + 1;
    await q('SELECT age FROM users_int WHERE seq=?', [seq]);
  }
  out.int_single_ms = Date.now() - t0;

  // UUID lookups
  t0 = Date.now();
  for (let i = 0; i < single; i++) {
    const seq = Math.floor(Math.random() * cnt) + 1;
    await q('SELECT age FROM users_uuid WHERE seq=?', [seq]);
  }
  out.uuid_single_ms = Date.now() - t0;

  fs.appendFileSync('benchmarks.txt', `Read ${single} random lookups: ${JSON.stringify(out)}\n`);
  res.json(out);
});

app.listen(PORT, async () => {
  await initDb();
  console.log(`Benchmark server running on http://localhost:${PORT}`);
});
