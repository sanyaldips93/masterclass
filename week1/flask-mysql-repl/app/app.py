from flask import Flask, request, jsonify
from db import get_connection

app = Flask(__name__)


@app.route("/users", methods=["POST"])
def create_user():
    data = request.json
    conn = get_connection(read=False)
    cur = conn.cursor()
    cur.execute("INSERT INTO users (name, email) VALUES (%s, %s)", (data["name"], data["email"]))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "User created"}), 201


@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    conn = get_connection(read=True)
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        return jsonify(row)
    return jsonify({"error": "User not found"}), 404


@app.route("/users", methods=["GET"])
def list_users():
    conn = get_connection(read=True)
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM users")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(rows)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
