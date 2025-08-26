# Minimal Polling Prototype (Short & Long Polling)

This server mocks EC2 instance creation and status polling using **short polling** and **long polling**.

## Start the Server
```bash
node app.js
```
Server runs on: `http://localhost:3000`

---

## APIs & Usage

### 1. Create a Mock Task
```bash
# Default: completes in ~5s, random success/fail
curl -X POST "http://localhost:3000/create"

# Custom delay (7s)
curl -X POST "http://localhost:3000/create?delay=7000"

# Force failure after 4s
curl -X POST "http://localhost:3000/create?delay=4000&fail=1"
```

Response:
```json
{
  "id": "1693057320000",
  "status": "pending",
  "delay": 4000,
  "willFail": true
}
```

---

### 2. Short Polling — Check Status
```bash
curl "http://localhost:3000/status/<id>"
```

Response example:
```json
{
  "id": "1693057320000",
  "status": "running"
}
```

---

### 3. Long Polling — Wait for Status
```bash
curl "http://localhost:3000/status-long/<id>"
```
- Keeps connection open until status changes from `pending` or timeout (30s).
- you can actually play with intervals and see how the cpu spikes up or down.

---

### 4. Cancel a Task
```bash
curl -X POST "http://localhost:3000/cancel/<id>"
```

Response:
```json
{
  "id": "1693057320000",
  "status": "cancelled"
}
```

---

## Notes
- `short polling` → client must poll repeatedly.
- `long polling` → server holds the request until completion.
- Tasks are stored **in-memory** only (reset when server restarts).
