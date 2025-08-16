# This code is generated through ChatGPT

"""
Simple MySQL Hash Routing (Flask) — Thoroughly Commented
--------------------------------------------------------

What this does (super simple):
- Uses **two MySQL databases** on the *same server*: `partition1` and `partition2`.
- Routes each request by a **very basic hash**: `id % 2`.
- **Creates the databases and the `users` table at startup** if they don't exist.
- Minimal HTTP router using **Flask** with two endpoints:
    - `POST /users` → insert user into the correct partition
    - `GET  /users/<id>` → read that user from the correct partition

Why this looks like sharding:
- Each partition is a separate MySQL database. You can think of them as two shards.
- The app decides where a row goes by hashing the key (here, just modulo 2).
- No rebalancing, no metadata tables, no complexity.

How to run:
    pip install flask mysql-connector-python
    export MYSQL_HOST=127.0.0.1 MYSQL_USER=root MYSQL_PASSWORD=secret
    python simple_sharding.py

Test:
    curl -X POST http://localhost:8000/users \
      -H 'content-type: application/json' \
      -d '{"id":1, "name":"Alice", "email":"a@example.com"}'

    curl http://localhost:8000/users/1
"""
import os
import mysql.connector
from mysql.connector import pooling
from flask import Flask, request, jsonify

# -----------------------------
# Configuration via environment variables
# -----------------------------
# These are read once on process start. You can hardcode defaults for dev.
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")

# Two partitions = two separate databases on the same server.
PARTITIONS = ["partition1", "partition2"]

# Schema for the `users` table (will exist inside EACH partition DB)
USERS_TABLE_SQL = (
    "CREATE TABLE IF NOT EXISTS users (\n"
    "  id BIGINT PRIMARY KEY,\n"
    "  name VARCHAR(255) NOT NULL,\n"
    "  email VARCHAR(255) UNIQUE\n"
    ") ENGINE=InnoDB"
)

# -----------------------------
# Bootstrap: ensure DBs and tables exist
# -----------------------------

def ensure_databases() -> None:
    """Ensure the two partition databases exist."""
    # Here we connect WITHOUT specifying a database.
    admin = mysql.connector.connect(
        host=MYSQL_HOST, port=MYSQL_PORT, user=MYSQL_USER, password=MYSQL_PASSWORD
    )
    # Create a cursor object. Think of this as your SQL command executor.
    cur = admin.cursor()
    try:
        for db in PARTITIONS:
            # This will create the database if missing (idempotent)
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{db}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
            )
        admin.commit()
    finally:
        cur.close()   # Close cursor when done (good practice)
        admin.close() # Close connection when done


def ensure_tables() -> None:
    """Ensure each partition has the `users` table."""
    for db in PARTITIONS:
        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=db,
        )
        cur = conn.cursor()  # Cursor = SQL command interface for this connection
        try:
            cur.execute(USERS_TABLE_SQL)  # Run CREATE TABLE
            conn.commit()
        finally:
            cur.close()
            conn.close()

# Run bootstrap once on startup
ensure_databases()
ensure_tables()

# -----------------------------
# Connection pools per partition
# -----------------------------
POOLS = {
    db: pooling.MySQLConnectionPool(
        pool_name=f"pool_{db}",
        pool_size=5,
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=db,
        auth_plugin="mysql_native_password",
    )
    for db in PARTITIONS
}

# -----------------------------
# Hashing + Routing
# -----------------------------
def get_partition(key: int | str) -> str:
    """Pick a partition by a very basic hash."""
    if isinstance(key, str):
        try:
            key = int(key)
        except ValueError:
            # fallback: sum of character codes
            key = sum(ord(c) for c in key)
    idx = int(key) % len(PARTITIONS)
    return PARTITIONS[idx]

# -----------------------------
# Flask app & endpoints
# -----------------------------
app = Flask(__name__)

@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok"}

@app.route("/users", methods=["POST"])
def create_user():
    """Insert a user into the correct partition."""
    data = request.json or {}

    # Minimal validation
    for field in ("id", "name", "email"):
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    user_id = data["id"]
    db = get_partition(user_id)

    # Get a pooled connection and cursor (cursor is how we run SQL)
    conn = POOLS[db].get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (id, name, email) VALUES (%s, %s, %s)",
            (data["id"], data["name"], data["email"]),
        )
        conn.commit()
    except mysql.connector.IntegrityError as e:
        return jsonify({"error": str(e)}), 409
    finally:
        cur.close()
        conn.close()

    return jsonify(data)

@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id: int):
    """Retrieve a user from the correct partition."""
    db = get_partition(user_id)
    conn = POOLS[db].get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, email FROM users WHERE id=%s", (user_id,))
        row = cur.fetchone()  # fetchone() pulls one row
    finally:
        cur.close()
        conn.close()

    if not row:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"id": row[0], "name": row[1], "email": row[2]})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)

# 👉 The key part: whenever you see `cur = conn.cursor()`, 
# that's you asking MySQL: *"give me a handle so I can send SQL statements"*. 
# You **must** use a cursor to execute queries (`cur.execute(...)`). When done, you close it to free resources.
