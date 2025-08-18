
# Minimal WebSocket Chat (Ephemeral)

Bare-minimum prototype. No persistence. When server stops or a client disconnects, history is gone.

## Run

```bash
pip install websockets
python server.py
```

Open http://localhost:8000 in multiple browser tabs and chat.

- WebSocket: `ws://localhost:8765`
- Static client: `http://localhost:8000`
- No database or files are written. All state is in-memory.
