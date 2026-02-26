import os
from datetime import datetime
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

load_dotenv()

app = Flask(__name__)

# Updated CORS for React frontend compatibility
CORS(app, resources={r"/*": {"origins": "*"}}, 
     expose_headers=['x-access-token'], 
     allow_headers=['Content-Type', 'x-access-token'])

app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "mumbai_university_it_2026")

# --- CONFIGURATION ---
UPLOAD_FOLDER = 'uploads'
MODEL_PATH = 'model/best.pt'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
geolocator = Nominatim(user_agent="pothole_fix_system")

# --- DATABASE & MODEL INITIALIZATION ---
try:
    model = YOLO(MODEL_PATH)
    client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
    db = client['pothole_db']
    reports_collection = db['reports']
    users_collection = db['users']
    print("✅ YOLO Model & MongoDB Connected Successfully")
except Exception as e:
    print(f"❌ Initialization Error: {e}")

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
    return jsonify({"message": "Pothole Detection API is Live 🚀"})

# 1. Pothole Detection & Reporting Route
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
        # Run YOLOv8 Inference
        results = model.predict(source=img_path, conf=0.4)
        pothole_count = len(results[0].boxes) if results and len(results) > 0 else 0

        # Automatic Municipality Assignment based on address
        assigned_municipality = "OTHER"
        addr_lower = address.lower()
        if "thane" in addr_lower: assigned_municipality = "TMC"
        elif "mumbai" in addr_lower or "bmc" in addr_lower: assigned_municipality = "BMC"
        elif "navi mumbai" in addr_lower: assigned_municipality = "NMMC"

        report_data = {
            "user_id": user_id,
            "user_name": request.form.get('user_name'),
            "user_email": request.form.get('user_email'),
            "pothole_count": pothole_count,
            "coordinates": {"lat": float(lat), "lng": float(lng)},
            "address": address,
            "municipality": assigned_municipality,
            "status": "Pending",
            "image_url": f"uploads/{img_filename}",
            "created_at": datetime.now()
        }

        inserted = reports_collection.insert_one(report_data)
        return jsonify({
            "message": "Report created", 
            "id": str(inserted.inserted_id), 
            "count": pothole_count
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. Real-time Prediction Route
@app.route('/predict', methods=['POST'])
def predict_only():
    if 'image' not in request.files:
        return jsonify({"error": "No image"}), 400
    
    file = request.files['image']
    filename = secure_filename(file.filename)
    temp_path = os.path.join(UPLOAD_FOLDER, f"temp_{filename}")
    file.save(temp_path)
    
    try:
        results = model.predict(source=temp_path, conf=0.4)
        count = len(results[0].boxes) if results and len(results) > 0 else 0
        os.remove(temp_path) 
        return jsonify({"pothole_count": count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. Fetch Reports (Role-Based)
@app.route('/reports', methods=['GET'])
def get_reports():
    admin_role = request.args.get('role')
    user_id = request.args.get('user_id')
    query = {} 
    
    if admin_role == 'admin-tmc': query = {"municipality": "TMC"}
    elif admin_role == 'admin-bmc': query = {"municipality": "BMC"}
    elif admin_role == 'admin-nmmc': query = {"municipality": "NMMC"}
    elif user_id: query = {"user_id": user_id}
        
    try:
        reports = list(reports_collection.find(query).sort("created_at", -1))
        for report in reports:
            report['_id'] = str(report['_id'])
        return jsonify(reports), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 4. Delete Report
@app.route('/reports/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    try:
        result = reports_collection.delete_one({"_id": ObjectId(report_id)})
        if result.deleted_count > 0:
            return jsonify({"message": "Report deleted successfully"}), 200
        return jsonify({"error": "Report not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 5. Auth Routes (Signup/Login)
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
        "role": data.get('role', 'user')
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
        'role': user.get('role', 'user')
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({
        'token': token, 
        'role': user.get('role', 'user'),
        'user_id': str(user['_id']),
        'name': user.get('name'),
        'email': user.get('email')
    })

# 6. Admin Resolve with AI Validation
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

        # AI Audit Check: Ensure road is actually fixed
        results = model.predict(source=res_path, conf=0.4)
        detected_potholes = len(results[0].boxes) if results and len(results) > 0 else 0

        if detected_potholes > 0:
            os.remove(res_path) # Reject and cleanup file
            return jsonify({
                "error": f"Rejected: AI detected {detected_potholes} potholes still present."
            }), 400

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

# 7. FIXED: Serve Uploaded Images
@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    # send_from_directory with os.getcwd() handles paths containing 'uploads/'
    return send_from_directory(os.getcwd(), filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)