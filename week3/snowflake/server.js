const express = require("express");
const { pool, initDB } = require("./db");
const snowflake = require("./snowflake");

const app = express();
app.use(express.json());

// Insert using Node.js Snowflake
app.post("/insert-node", async (req, res) => {
  const id = snowflake.nextId();
  const value = req.body.value || "node-value";

  await pool.query("INSERT INTO snowflake_demo.table_node (id, value) VALUES (?, ?)", [id, value]);
  res.json({ id, source: "node" });
});

// Insert using DB Stored Procedure
app.post("/insert-db", async (req, res) => {
  const value = req.body.value || "db-value";

  const [rows] = await pool.query("CALL snowflake_demo.generate_id(@id); SELECT @id as id;");
  const id = rows[1][0].id;

  await pool.query("INSERT INTO snowflake_demo.table_db (id, value) VALUES (?, ?)", [id, value]);
  res.json({ id, source: "db" });
});

// Start after DB init
(async () => {
  try {
    await initDB();
    app.listen(3000, () => console.log("🚀 Server running on port 3000"));
  } catch (err) {
    console.error("❌ Failed to init DB:", err);
    process.exit(1);
  }
})();
