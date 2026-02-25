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
CORS(app, resources={r"/*": {"origins": "*"}}, headers=['Content-Type', 'x-access-token'])
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "your_super_secret_key")

# --- CONFIGURATION ---
UPLOAD_FOLDER = 'uploads'
MODEL_PATH = 'model/best.pt'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
geolocator = Nominatim(user_agent="pothole_system")

# --- DATABASE & MODEL ---
try:
    model = YOLO(MODEL_PATH)
    client = MongoClient(os.getenv("MONGO_URI"))
    db = client['pothole_db']
    reports_collection = db['reports']
    users_collection = db['users']
    print("✅ YOLO & MongoDB Connected Successfully")
except Exception as e:
    print(f"❌ Initialization Error: {e}")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('x-access-token') # <--- Check this name
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # secret_key wahi honi chahiye jo login mein use ki thi
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = users_collection.find_one({"_id": ObjectId(data['user_id'])})
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

# --- ROUTES ---

@app.route('/')
def home():
    return jsonify({"message": "Pothole Detection Server Running 🚀"})

@app.route('/predict', methods=['POST'])
@token_required
def predict(current_user):
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files['image']
    lat = request.form.get('lat')
    lng = request.form.get('lng')

    if not lat or not lng:
        return jsonify({"error": "Latitude & Longitude required"}), 400

    filename = secure_filename(file.filename)
    img_path = os.path.join(UPLOAD_FOLDER, f"{datetime.now().timestamp()}_{filename}")
    file.save(img_path)

    try:
        results = model.predict(source=img_path, conf=0.5)
        pothole_count = len(results[0].boxes) if results and results[0].boxes is not None else 0

        # 1. Reverse Geocoding & Municipality Detection
        address = "Address not found"
        assigned_municipality = "OTHER" # Default
        
        try:
            location = geolocator.reverse(f"{lat}, {lng}")
            if location:
                address = location.address
                addr_lower = address.lower()
                
                # Logic to tag report to specific body
                if "thane" in addr_lower:
                    assigned_municipality = "TMC"
                elif "mumbai" in addr_lower or "bmc" in addr_lower:
                    assigned_municipality = "BMC"
                elif "navi mumbai" in addr_lower:
                    assigned_municipality = "NMMC"
        except Exception as geo_err:
            print(f"⚠️ Geocoding Error: {geo_err}")

        # 2. Save Report with Municipality Tag
        report_data = {
            "user_id": str(current_user['_id']),
            "pothole_count": pothole_count,
            "coordinates": {"lat": float(lat), "lng": float(lng)},
            "address": address,
            "municipality": assigned_municipality, # Filters reports for admins
            "status": "Pending",
            "image_url": img_path,
            "created_at": datetime.now()
        }

        inserted = reports_collection.insert_one(report_data)

        return jsonify({
            "status": "success",
            "pothole_count": pothole_count,
            "municipality": assigned_municipality,
            "report_id": str(inserted.inserted_id)
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/reports', methods=['GET'])
def get_reports():
    admin_role = request.args.get('role')
    query = {} 
    
    # Filtering Logic for Admins
    if admin_role == 'admin-tmc':
        query = {"municipality": "TMC"}
    elif admin_role == 'admin-bmc':
        query = {"municipality": "BMC"}
    elif admin_role == 'admin-nmmc':
        query = {"municipality": "NMMC"}
        
    try:
        reports = list(reports_collection.find(query).sort("created_at", -1))
        for report in reports:
            report['_id'] = str(report['_id'])
        return jsonify(reports), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
        "role": "user"
    })
    return jsonify({"message": "User created successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = users_collection.find_one({"email": data['email']})
    
    if not user or not check_password_hash(user['password'], data['password']):
        return jsonify({"message": "Login failed"}), 401
        
    token = jwt.encode({
        'user_id': str(user['_id']), 
        'role': user.get('role', 'user')
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({'token': token, 'role': user.get('role', 'user')})

@app.route('/update_status/<report_id>', methods=['PATCH'])
def update_status(report_id):
    try:
        result = reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"status": "Resolved"}}
        )
        return jsonify({"message": "Status updated"}), 200 if result.modified_count > 0 else 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)