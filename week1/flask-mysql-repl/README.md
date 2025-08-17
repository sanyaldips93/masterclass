# Flask + MySQL Replication Demo

## Overview
This project demonstrates:
- A Flask API with CRUD (only create + read).
- MySQL master-replica setup with 5s delay (pull-based).
- Basic failover logic in Flask:
  - Reads → Replica (stale data allowed for ~5s).
  - If replica fails → Reads from master.
  - If master fails → Replica promoted.

## Endpoints
- `POST /users` → create new user
- `GET /users/:id` → fetch user by id (from replica)
- `GET /users` → list all users (from replica)

## Running
1. Start MySQL cluster:
   ```bash
   docker-compose up -d
   ```
2. Install Python deps:
   ```bash
   cd app
   pip install -r requirements.txt
   ```
3. Start Flask:
   ```bash
   python app.py
   ```
4. API runs at `http://127.0.0.1:5000`.

## Notes
- Replica is ~5s behind master.
- Failover: if replica is down, reads go to master.
- If master is down, replica is promoted.
