from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["https://pothole-detection-website.vercel.app"])

@app.route('/')
def home():
    return jsonify({"message": "Backend is working!"})

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    return jsonify({"message": "Login endpoint reached"})

if __name__ == '__main__':
    app.run()