import mysql.connector
import threading
import time
from queue import Queue

# --- DB Config ---
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "local"
}

# --- Helper: Initialize table ---
def init_db():
    conn = mysql.connector.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS test (
            id INT AUTO_INCREMENT PRIMARY KEY,
            value VARCHAR(255),
            type VARCHAR(10)
        )
    """)
    conn.commit()
    conn.close()

# ---------------------------
# 1. No Connection Pool Class
# ---------------------------
class NoConnectionPool:
    def get_connection(self):
        # Creates a new TCP connection each time
        return mysql.connector.connect(**DB_CONFIG)

    def release_connection(self, conn):
        conn.close()

# ------------------------------
# 2. Blocking Queue Connection Pool
# ------------------------------
class BlockingQueueConnectionPool:
    def __init__(self, maxsize):
        self.pool = Queue(maxsize=maxsize)
        for _ in range(maxsize):
            self.pool.put(mysql.connector.connect(**DB_CONFIG))

    def get_connection(self):
        thread_name = threading.current_thread().name
        # if self.pool.empty():
        #     print(f"[{thread_name}] Waiting for connection...")
        conn = self.pool.get()  # Blocks if empty
        # print(f"[{thread_name}] Acquired connection")
        return conn

    def release_connection(self, conn):
        self.pool.put(conn)
        thread_name = threading.current_thread().name
        # print(f"[{thread_name}] Released connection")

# --------------------------
# Simulated DB operation
# --------------------------
def db_task(pool, task_id, type):
    thread_name = threading.current_thread().name
    conn = pool.get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO test (value, type) VALUES (%s, %s)",
        (f"Task {task_id}", f"{type}")
    )
    conn.commit()
    time.sleep(0.2)  # Simulate slow query
    pool.release_connection(conn)
    # print(f"[{thread_name}] Finished task {task_id}")

# --------------------------
# Test functions
# --------------------------
def run_without_pool(num_tasks):
    print("\n--- Running WITHOUT Connection Pool ---")
    pool = NoConnectionPool()
    threads = []
    start = time.time()
    for i in range(num_tasks):
        t = threading.Thread(target=db_task, args=(pool, i, "nopool"), name=f"Thread-{i}")
        t.start()
        threads.append(t)
    for t in threads:
        t.join()
    print(f"Time taken without pool: {time.time() - start:.2f} seconds")

def run_with_pool(num_tasks, pool_size):
    print("\n--- Running WITH Blocking Queue Connection Pool ---")
    pool = BlockingQueueConnectionPool(maxsize=pool_size)
    threads = []
    start = time.time()
    for i in range(num_tasks):
        t = threading.Thread(target=db_task, args=(pool, i, "pool"), name=f"Thread-{i}")
        t.start()
        threads.append(t)
    for t in threads:
        t.join()
    print(f"Time taken with pool (size={pool_size}): {time.time() - start:.2f} seconds")

# --------------------------
# Main execution
# --------------------------
if __name__ == "__main__":
    init_db()

    NUM_TASKS = 1500
    POOL_SIZE = 150

    # run_without_pool(NUM_TASKS)
    run_with_pool(NUM_TASKS, POOL_SIZE)
