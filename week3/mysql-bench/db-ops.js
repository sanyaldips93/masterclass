import { log } from "./logger.js";
import { nextId } from "./id-gen.js";


function hrMillis(start, end) {
  return Number((end - start) / 1000000n);
}

export async function ensureTables(conn) {
  await conn.query("DROP TABLE IF EXISTS t_int");
  await conn.query("DROP TABLE IF EXISTS t_varchar");

  await conn.query(`
    CREATE TABLE t_int (
      id INT AUTO_INCREMENT PRIMARY KEY,
      age INT
    ) ENGINE=InnoDB
  `);

  await conn.query(`
    CREATE TABLE t_varchar (
      id VARCHAR(16) PRIMARY KEY,
      age INT
    ) ENGINE=InnoDB
  `);

  log("Tables created");
}

export async function insertRows(conn, table, total = 1_000_000, batch = 5000) {
  const batches = Math.ceil(total / batch);
  const start = process.hrtime.bigint();

  if (table === "t_int") {
    const stmt = `INSERT INTO t_int (age) VALUES ?`;
    for (let b = 0; b < batches; b++) {
      const rows = [];
      const batchCount = Math.min(batch, total - b * batch);
      for (let i = 0; i < batchCount; i++) rows.push([Math.floor(Math.random() * 100)]);
      await conn.query(stmt, [rows]);
    }
  } else {
    const stmt = `INSERT INTO t_varchar (id, age) VALUES ?`;
    for (let b = 0; b < batches; b++) {
      const rows = [];
      const batchCount = Math.min(batch, total - b * batch);
      for (let i = 0; i < batchCount; i++) {
        const id = nextId();
        rows.push([id, Math.floor(Math.random() * 100)]);
      }
      await conn.query(stmt, [rows]);
    }
  }

  const end = process.hrtime.bigint();
  const ms = hrMillis(start, end);
  log(`${table} | Insert ${total} rows | elapsed_ms=${ms}`);
  return ms;
}

export async function randomSelects(conn, table, count = 1000) {
  const [explain] = await conn.query(`EXPLAIN SELECT * FROM \`${table}\` WHERE age = ?`, [42]);
  log(`${table} | EXPLAIN random select: ${JSON.stringify(explain)}`);
  
  const start = process.hrtime.bigint();
  const sql =
    table === "t_int"
      ? `SELECT id,age FROM t_int WHERE age=? LIMIT 1`
      : `SELECT id,age FROM t_varchar WHERE age=? LIMIT 1`;

  for (let i = 0; i < count; i++) {
    await conn.query(sql, [Math.floor(Math.random() * 100)]);
  }

  const end = process.hrtime.bigint();
  const ms = hrMillis(start, end);
  log(`${table} | ${count} random selects | total_ms=${ms} | avg_ms=${ms / count}`);
  return { totalMs: ms, avgMs: ms / count };
}

export async function deleteAll(conn, table, batchSize = 10000) {
  const start = process.hrtime.bigint();
  let totalDeleted = 0;

  while (true) {
    const [res] = await conn.query(
      `DELETE FROM \`${table}\` ORDER BY id LIMIT ?`,
      [batchSize]
    );
    if (res.affectedRows === 0) break;
    totalDeleted += res.affectedRows;
  }

  const end = process.hrtime.bigint();
  const ms = Number((end - start) / 1000000n);
  log(`${table} | Delete all in batches of ${batchSize} | rows=${totalDeleted} | elapsed_ms=${ms}`);
  return ms;
}

