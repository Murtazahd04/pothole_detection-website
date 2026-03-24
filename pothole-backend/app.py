import os
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
from pymongo import MongoClient
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from bson import ObjectId
from geopy.geocoders import Nominatim
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import base64
from io import BytesIO
from PIL import Image
import cv2
import numpy as np

load_dotenv()

app = Flask(__name__)

# Configure CORS properly
CORS(app, 
     origins=["https://pothole-detection-website.vercel.app", "https://pothole-detection-website.onrender.com"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "x-access-token"],
     expose_headers=["x-access-token"],
     supports_credentials=True)

# Handle OPTIONS requests for all routes
@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers.add("Access-Control-Allow-Origin", "https://pothole-detection-website.vercel.app")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, x-access-token")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        return response


app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "mumbai_university_it_2026")
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
geolocator = Nominatim(user_agent="pothole_fix_system")

# Municipality boundaries
MUNICIPALITY_BOUNDARIES = {
    "BMC": {
        "lat_range": [18.89, 19.30],
        "lng_range": [72.77, 72.99],
        "name": "Brihanmumbai Municipal Corporation"
    },
    "TMC": {
        "lat_range": [19.15, 19.35],
        "lng_range": [72.95, 73.10],
        "name": "Thane Municipal Corporation"
    },
    "NMMC": {
        "lat_range": [18.95, 19.15],
        "lng_range": [72.95, 73.10],
        "name": "Navi Mumbai Municipal Corporation"
    }
}

# --- DATABASE & MODEL INITIALIZATION ---
try:
    # Load model
    model_path = os.path.join(BASE_DIR, 'model', 'best.pt')
    if os.path.exists(model_path):
        model = YOLO(model_path)
        print("✅ YOLO Model Loaded Successfully")
    else:
        print(f"⚠️ Model file not found at {model_path}")
        model = None
    
    # MongoDB Atlas connection
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("❌ MONGO_URI not found in environment variables")
        raise Exception("MONGO_URI not configured")
    
    client = MongoClient(mongo_uri)
    # Test connection
    client.admin.command('ping')
    print("✅ MongoDB Atlas Connected Successfully")
    
    db = client['pothole_db']
    reports_collection = db['reports']
    users_collection = db['users']
    
    # Create indexes for better performance
    reports_collection.create_index([("coordinates", "2dsphere")])
    reports_collection.create_index("user_id")
    reports_collection.create_index("status")
    users_collection.create_index("email", unique=True)
    
except Exception as e:
    print(f"❌ Initialization Error: {e}")
    model = None
    client = None

# --- HELPER FUNCTIONS ---
def detect_municipality_by_coordinates(lat, lng):
    for muni_id, bounds in MUNICIPALITY_BOUNDARIES.items():
        if (bounds["lat_range"][0] <= lat <= bounds["lat_range"][1] and
            bounds["lng_range"][0] <= lng <= bounds["lng_range"][1]):
            return muni_id
    return "OTHER"

def detect_municipality_by_address(address):
    addr_lower = address.lower()
    if "thane" in addr_lower:
        return "TMC"
    elif "mumbai" in addr_lower or "bmc" in addr_lower:
        return "BMC"
    elif "navi mumbai" in addr_lower or "nmmc" in addr_lower:
        return "NMMC"
    return "OTHER"

def reverse_geocode(lat, lng):
    try:
        location = geolocator.reverse(f"{lat}, {lng}")
        return location.address if location else "Address not found"
    except:
        return f"Coordinates: {lat}, {lng}"

# --- AUTH DECORATOR ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('x-access-token')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = users_collection.find_one({"_id": ObjectId(data['user_id'])})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# --- ROUTES ---
@app.route('/')
def home():
    return jsonify({"message": "Pothole Detection API is Live 🚀", "status": "running"})

@app.route('/health')
def health():
    db_status = "connected" if client else "disconnected"
    model_status = "loaded" if model else "not loaded"
    return jsonify({
        "status": "healthy",
        "database": db_status,
        "model": model_status
    })

# Real-time detection endpoint
@app.route('/detect-realtime', methods=['POST'])
def detect_realtime():
    if not model:
        return jsonify({"error": "Model not loaded"}), 503
    
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({"error": "No image data"}), 400
        
        image_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes))
        
        temp_filename = f"realtime_{datetime.now().timestamp()}.jpg"
        temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
        image.save(temp_path)
        
        try:
            results = model.predict(source=temp_path, conf=0.4)
            pothole_count = len(results[0].boxes) if results and len(results) > 0 else 0
            
            boxes = []
            if pothole_count > 0 and results[0].boxes is not None:
                for box in results[0].boxes:
                    boxes.append({
                        'x1': float(box.xyxy[0][0]),
                        'y1': float(box.xyxy[0][1]),
                        'x2': float(box.xyxy[0][2]),
                        'y2': float(box.xyxy[0][3]),
                        'confidence': float(box.conf[0])
                    })
            
            os.remove(temp_path)
            
            return jsonify({
                "success": True,
                "pothole_count": pothole_count,
                "boxes": boxes,
                "detected": pothole_count > 0
            }), 200
            
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return jsonify({"error": str(e)}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Auto-report endpoint
@app.route('/auto-report', methods=['POST'])
def auto_report():
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({"error": "No image data"}), 400
        
        if 'latitude' not in data or 'longitude' not in data:
            return jsonify({"error": "Location coordinates required"}), 400
        
        user_id = data.get('user_id')
        user_name = data.get('user_name', "Anonymous")
        
        lat = float(data['latitude'])
        lng = float(data['longitude'])
        
        address = reverse_geocode(lat, lng)
        municipality = detect_municipality_by_coordinates(lat, lng)
        if municipality == "OTHER":
            municipality = detect_municipality_by_address(address)
        
        image_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        image_bytes = base64.b64decode(image_data)
        
        img_filename = f"auto_{datetime.now().timestamp()}.jpg"
        img_path = os.path.join(UPLOAD_FOLDER, img_filename)
        
        image = Image.open(BytesIO(image_bytes))
        image.save(img_path)
        
        pothole_count = data.get('pothole_count', 0)
        
        report_data = {
            "user_id": user_id,
            "user_name": user_name,
            "pothole_count": pothole_count,
            "coordinates": {"lat": lat, "lng": lng},
            "address": address,
            "municipality": municipality,
            "status": "Pending",
            "image_url": f"uploads/{img_filename}",
            "auto_detected": True,
            "created_at": datetime.now()
        }
        
        inserted = reports_collection.insert_one(report_data)
        
        return jsonify({
            "success": True,
            "message": "Report submitted automatically!",
            "report_id": str(inserted.inserted_id),
            "pothole_count": pothole_count,
            "municipality": municipality,
            "municipality_name": MUNICIPALITY_BOUNDARIES.get(municipality, {}).get("name", "Unknown")
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get municipality by coordinates
@app.route('/get-municipality', methods=['GET'])
def get_municipality():
    try:
        lat = float(request.args.get('lat', 0))
        lng = float(request.args.get('lng', 0))
        
        if lat == 0 or lng == 0:
            return jsonify({"error": "Coordinates required"}), 400
        
        municipality = detect_municipality_by_coordinates(lat, lng)
        address = reverse_geocode(lat, lng)
        
        return jsonify({
            "municipality": municipality,
            "municipality_name": MUNICIPALITY_BOUNDARIES.get(municipality, {}).get("name", "Unknown"),
            "address": address,
            "lat": lat,
            "lng": lng
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Regular report route
@app.route('/report', methods=['POST'])
def report_pothole():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files['image']
    user_id = request.form.get('user_id')
    lat = request.form.get('latitude')
    lng = request.form.get('longitude')
    address = request.form.get('address', "Unknown Address")

    if not lat or not lng:
        return jsonify({"error": "GPS coordinates are required"}), 400

    filename = secure_filename(file.filename)
    img_filename = f"{datetime.now().timestamp()}_{filename}"
    img_path = os.path.join(UPLOAD_FOLDER, img_filename)
    file.save(img_path)

    try:
        if model:
            results = model.predict(source=img_path, conf=0.4)
            pothole_count = len(results[0].boxes) if results and len(results) > 0 else 0
        else:
            pothole_count = 0

        lat_float = float(lat)
        lng_float = float(lng)
        municipality = detect_municipality_by_coordinates(lat_float, lng_float)
        if municipality == "OTHER":
            municipality = detect_municipality_by_address(address)

        report_data = {
            "user_id": user_id,
            "user_name": request.form.get('user_name'),
            "user_email": request.form.get('user_email'),
            "pothole_count": pothole_count,
            "coordinates": {"lat": lat_float, "lng": lng_float},
            "address": address,
            "municipality": municipality,
            "status": "Pending",
            "image_url": f"uploads/{img_filename}",
            "created_at": datetime.now()
        }

        inserted = reports_collection.insert_one(report_data)
        return jsonify({
            "message": "Report created", 
            "id": str(inserted.inserted_id), 
            "count": pothole_count,
            "municipality": municipality
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Fetch reports
@app.route('/reports', methods=['GET'])
def get_reports():
    admin_role = request.args.get('role')
    user_id = request.args.get('user_id')
    query = {} 
    
    if admin_role == 'admin-tmc': 
        query = {"municipality": "TMC"}
    elif admin_role == 'admin-bmc': 
        query = {"municipality": "BMC"}
    elif admin_role == 'admin-nmmc': 
        query = {"municipality": "NMMC"}
    elif user_id: 
        query = {"user_id": user_id}
        
    try:
        reports = list(reports_collection.find(query).sort("created_at", -1))
        for report in reports:
            report['_id'] = str(report['_id'])
        return jsonify(reports), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Auth routes
@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    if users_collection.find_one({"email": data['email']}):
        return jsonify({"message": "User already exists"}), 400
    
    hashed_password = generate_password_hash(data['password'])
    users_collection.insert_one({
        "name": data['name'],
        "email": data['email'],
        "password": hashed_password,
        "municipality": data.get('municipality', 'TMC'),
        "role": data.get('role', 'user'),
        "created_at": datetime.now()
    })
    return jsonify({"message": "User created successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = users_collection.find_one({"email": data['email']})
    
    if not user or not check_password_hash(user['password'], data['password']):
        return jsonify({"message": "Invalid Email or Password"}), 401
        
    token = jwt.encode({
        'user_id': str(user['_id']), 
        'role': user.get('role', 'user'),
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({
        'token': token, 
        'role': user.get('role', 'user'), 
        'user_id': str(user['_id']), 
        'name': user.get('name')
    })

# Update status (admin resolve)
@app.route('/update_status/<report_id>', methods=['PATCH'])
def update_status(report_id):
    try:
        if 'resolved_image' not in request.files:
            return jsonify({"error": "Resolution image is required"}), 400

        file = request.files['resolved_image']
        filename = secure_filename(file.filename)
        res_filename = f"fixed_{datetime.now().timestamp()}_{filename}"
        res_path = os.path.join(UPLOAD_FOLDER, res_filename)
        file.save(res_path)

        if model:
            results = model.predict(source=res_path, conf=0.4)
            detected_potholes = len(results[0].boxes) if results and len(results) > 0 else 0

            if detected_potholes > 0:
                os.remove(res_path)
                return jsonify({"error": f"Rejected: AI detected {detected_potholes} potholes still present."}), 400

        reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {
                "status": "Resolved",
                "resolved_image_url": f"uploads/{res_filename}",
                "resolved_at": datetime.now()
            }}
        )
        return jsonify({"message": "Road verified clear. Status updated! ✅"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Delete report
@app.route('/reports/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    try:
        result = reports_collection.delete_one({"_id": ObjectId(report_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Report not found"}), 404
        return jsonify({"message": "Report deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Serve uploaded images
@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)