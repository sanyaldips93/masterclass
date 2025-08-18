#!/usr/bin/env python3
"""
Minimal WebSocket chat (ephemeral).

Key points:
- Single Python process provides both:
    * A static HTTP server for serving `index.html` (port 8000).
    * A WebSocket server for chat messaging (port 8765).
- No persistence: all messages and connections exist only in memory.
- When server stops or client disconnects, everything is lost.
"""

import asyncio
import json
import logging
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer

import websockets

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# -----------------------------------------------------------------------------
# HTTP server (for serving index.html so browser clients can connect)
# -----------------------------------------------------------------------------
def start_http_server(directory: str = ".", host: str = "0.0.0.0", port: int = 8000):
    """
    Start a simple HTTP server on `host:port` that serves static files
    from the given `directory`. In our case, it serves `index.html`.
    """
    class Handler(SimpleHTTPRequestHandler):
        # Override to set default directory
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=directory, **kwargs)

        def log_message(self, fmt, *args):
            # Redirect HTTP logs to Python logging
            logging.info("HTTP: " + fmt, *args)

    httpd = HTTPServer((host, port), Handler)
    logging.info(f"HTTP server serving '{directory}' at http://{host}:{port}")
    httpd.serve_forever()

# -----------------------------------------------------------------------------
# WebSocket chat server (core chat logic)
# -----------------------------------------------------------------------------
class ChatServer:
    def __init__(self):
        # Store user data per connection
        # Example: ws -> {"name": str, "role": "admin"|"user"}
        self.clients = {}
        self.lock = asyncio.Lock()

    async def register(self, ws, name: str, role: str = "user"):
        async with self.lock:
            self.clients[ws] = {"name": name, "role": role}
            logging.info("Client joined: %s (total=%d)", name, len(self.clients))

    async def unregister(self, ws):
        async with self.lock:
            data = self.clients.pop(ws, None)
            if data:
                logging.info("Client left: %s (total=%d)", data["name"], len(self.clients))
            return data

    async def broadcast(self, payload: dict):
        """Send a JSON payload to all clients."""
        if not self.clients:
            return
        msg = json.dumps(payload)
        await asyncio.gather(*(self._safe_send(ws, msg) for ws in list(self.clients.keys())))

    async def _safe_send(self, ws, msg: str):
        try:
            await ws.send(msg)
        except Exception:
            await self.unregister(ws)

    async def kick_all(self):
        """Disconnect all users (admin only)."""
        for ws in list(self.clients.keys()):
            await ws.close(code=4000, reason="Admin kicked everyone")
        self.clients.clear()

    async def announce(self, text: str):
        """Broadcast admin announcement."""
        await self.broadcast({"type": "system", "text": f"[ADMIN]: {text}"})

    async def handler(self, ws):
        # Expect join first
        try:
            raw = await ws.recv()
            data = json.loads(raw)
            if not isinstance(data, dict) or data.get("type") != "join":
                await ws.close()
                return

            name = str(data["name"])[:32]

            # special rule: if name starts with "admin:" -> role=admin
            if name.startswith("admin:"):
                role = "admin"
                name = name.split("admin:", 1)[1] or "Admin"
            else:
                role = "user"

            await self.register(ws, name, role)
            await self.broadcast({"type": "system", "text": f"{name} joined."})

            async for raw in ws:
                d = json.loads(raw)
                if d.get("type") == "msg":
                    text = d.get("text", "")
                    if role == "admin":
                        # check for admin commands
                        if text.startswith("/kickall"):
                            await self.kick_all()
                        elif text.startswith("/announce "):
                            await self.announce(text[len("/announce "):])
                        else:
                            await self.broadcast({"type": "msg", "from": f"[ADMIN]{name}", "text": text})
                    else:
                        # normal user msg
                        await self.broadcast({"type": "msg", "from": name, "text": text})

        except Exception:
            pass
        finally:
            left = await self.unregister(ws)
            if left:
                await self.broadcast({"type": "system", "text": f"{left['name']} left."})


# -----------------------------------------------------------------------------
# Entry point
# -----------------------------------------------------------------------------
async def main():
    # Start HTTP server (in separate thread)
    threading.Thread(
        target=start_http_server,
        kwargs={"directory": ".", "host": "0.0.0.0", "port": 8000},
        daemon=True
    ).start()

    chat = ChatServer()

    # Start WebSocket server
    async with websockets.serve(
        chat.handler,
        "0.0.0.0",
        8765,
        ping_interval=20,   # keepalive pings
        max_size=2**20      # limit max message size (1 MB)
    ):
        logging.info("WebSocket server at ws://0.0.0.0:8765")
        logging.info("Open the client: http://localhost:8000/ (or your host IP)")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
