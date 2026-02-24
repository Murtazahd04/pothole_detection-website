import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from pymongo import MongoClient
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Folder & Model
UPLOAD_FOLDER = 'uploads'
MODEL_PATH = 'model/best.pt'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load YOLO Model
try:
    model = YOLO(MODEL_PATH)
    print("✅ YOLO Model Loaded Successfully")
except Exception as e:
    print(f"❌ YOLO Load Error: {e}")

# MongoDB Connection
try:
    client = MongoClient(os.getenv("MONGO_URI"))
    db = client['pothole_db']
    reports_collection = db['reports']
    print("✅ MongoDB Connected")
except Exception as e:
    print(f"❌ MongoDB Error: {e}")


@app.route('/')
def home():
    return jsonify({"message": "Pothole Detection Server Running 🚀"})

@app.route('/predict', methods=['POST'])
def predict():

    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files['image']
    lat = request.form.get('lat')
    lng = request.form.get('lng')

    if not lat or not lng:
        return jsonify({"error": "Latitude & Longitude required"}), 400

    filename = secure_filename(file.filename)
    img_path = os.path.join(
        UPLOAD_FOLDER,
        f"{datetime.timestamp(datetime.now())}_{filename}"
    )
    file.save(img_path)

    try:
        results = model.predict(source=img_path, conf=0.5)
        pothole_count = len(results[0].boxes) if results and results[0].boxes is not None else 0

        report_data = {
            "pothole_count": pothole_count,
            "coordinates": {
                "lat": float(lat),
                "lng": float(lng)
            },
            "status": "Pending",
            "image_url": img_path,
            "created_at": datetime.now()
        }

        inserted = reports_collection.insert_one(report_data)

        return jsonify({
            "status": "success",
            "pothole_count": pothole_count,
            "report_id": str(inserted.inserted_id)
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# app.py mein niche ye route add karein

@app.route('/reports', methods=['GET'])
def get_reports():
    reports = list(reports_collection.find().sort("created_at", -1)) # Latest reports upar
    for report in reports:
        report['_id'] = str(report['_id'])
    return jsonify(reports)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)