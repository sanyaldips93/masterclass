import sqlite3 from "sqlite3";
sqlite3.verbose();

// Create or open a file-based SQLite DB
const db = new sqlite3.Database("./data.db");

// Ensure table exists
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT UNIQUE,  -- type is unique so upsert can target it
      payload TEXT
    )
  `);
});

export default db;
