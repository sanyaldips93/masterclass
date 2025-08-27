export async function ensureNoIndex(conn, table, idxName = "idx_age") {
  const [idx] = await conn.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, idxName]
  );
  if (idx.length) {
    await conn.query(`ALTER TABLE \`${table}\` DROP INDEX \`${idxName}\``);
  }
}

export async function createIndex(conn, table, idxName = "idx_age") {
  await conn.query(`ALTER TABLE \`${table}\` ADD INDEX \`${idxName}\` (age)`);
}
