from flask import Flask, Response, send_file, jsonify, request
import time
import threading

app = Flask(__name__)

# Store active connections (generators) in memory
clients = []

@app.route("/")
def index():
    # Serve the same HTML file
    return send_file("index.html")


@app.route("/events")
def events():
    def stream():
        # Keep the connection open forever
        messages = []
        clients.append(messages)

        try:
            while True:
                # If new messages exist, yield them
                if messages:
                    data = messages.pop(0)
                    yield f"data: {data}\n\n"
                time.sleep(0.5)
        except GeneratorExit:
            # Client disconnected
            clients.remove(messages)

    # Return streaming response
    return Response(stream(), mimetype="text/event-stream")


@app.route("/deploy")
def deploy():
    # Deployment steps to simulate logs
    steps = [
        "Checking system requirements...",
        "Pulling source code from repository...",
        "Installing dependencies...",
        "Running tests...",
        "Building application...",
        "Creating Docker image...",
        "Pushing Docker image to registry...",
        "Updating Kubernetes manifests...",
        "Deploying pods...",
        "Waiting for pods to be ready...",
        "Deployment finished successfully ✅"
    ]

    # Background thread to push logs asynchronously
    def push_logs():
        for step in steps:
            log = f"[{time.strftime('%H:%M:%S')}] {step}"
            for client in clients:
                client.append(log)
            time.sleep(1)  # simulate delay between steps

    threading.Thread(target=push_logs).start()

    return jsonify({"status": "Deployment started"})


if __name__ == "__main__":
    app.run(port=8000, debug=True, threaded=True)
