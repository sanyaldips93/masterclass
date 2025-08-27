const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "pass@123",
  multipleStatements: true
});

async function initDB() {
  const conn = await pool.getConnection();

  await conn.query(`
    CREATE DATABASE IF NOT EXISTS snowflake_demo;
    USE snowflake_demo;

    CREATE TABLE IF NOT EXISTS table_node (
      id BIGINT PRIMARY KEY,
      value VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS table_db (
      id BIGINT PRIMARY KEY,
      value VARCHAR(50)
    );

    DROP PROCEDURE IF EXISTS generate_id;
    CREATE PROCEDURE generate_id(OUT new_id BIGINT)
    BEGIN
      SET new_id = (UNIX_TIMESTAMP(NOW(3)) * 1000) MOD 65536;
    END;
  `);

  conn.release();
  console.log("✅ Database & tables ready");
}

module.exports = { pool, initDB };
