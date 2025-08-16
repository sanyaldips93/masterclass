# Note: Python is thread safe due to GIL (Global Interpretor Lock)

import threading
import time

NUM_VALUES = 50_000  # keep this reasonable to avoid killing your Mac

# --------------------
# Thread-safe version
# --------------------
def thread_safe_demo():
    print("\n=== THREAD-SAFE VERSION ===")
    q = []
    mutex = threading.Lock()

    def insert_task(i):
        with mutex:
            q.append(i)

    start = time.time()
    threads = []
    for i in range(NUM_VALUES):
        t = threading.Thread(target=insert_task, args=(i,))
        t.start()
        threads.append(t)

    for t in threads:
        t.join()
    end = time.time()

    print(f"Expected size: {NUM_VALUES}, Actual size: {len(q)}")
    print(f"Time: {end - start:.2f}s")


# --------------------
# Non-thread-safe version
# --------------------
def non_thread_safe_demo():
    print("\n=== NON-THREAD-SAFE VERSION ===")
    q = []

    def insert_task(i):
        q.append(i)  # not protected by mutex

    start = time.time()
    threads = []
    for i in range(NUM_VALUES):
        t = threading.Thread(target=insert_task, args=(i,))
        t.start()
        threads.append(t)

    for t in threads:
        t.join()
    end = time.time()

    print(f"Expected size: {NUM_VALUES}, Actual size: {len(q)}")
    print(f"Time: {end - start:.2f}s")


if __name__ == "__main__":
    thread_safe_demo()
    non_thread_safe_demo()
