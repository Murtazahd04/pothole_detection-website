import React, { useState } from 'react';
import { uploadPothole } from '../services/api';
import { Camera, MapPin, Loader } from 'lucide-react';

const PotholeForm = () => {
    const [image, setImage] = useState(null);
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    // 1. Get Live Location
    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setStatus("Location Captured! ✅");
            }, (error) => {
                alert("Please enable GPS/Location access.");
            });
        }
    };

    // 2. Handle File Selection
    const handleFileChange = (e) => {
        setImage(e.target.files[0]);
    };

    // 3. Submit Form
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!image || !location.lat) {
            alert("Please select image and capture location!");
            return;
        }

        const formData = new FormData();
        formData.append('image', image);
        formData.append('lat', location.lat);
        formData.append('lng', location.lng);

        setLoading(true);
        setStatus("Detecting Potholes... Please wait.");
        
        try {
            const data = await uploadPothole(formData);
            setStatus(`Success! Detected ${data.pothole_count} potholes.`);
        } catch (err) {
            setStatus("Failed to upload. Check Backend connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Report Pothole</h2>
            
            <button onClick={getLocation} className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded">
                <MapPin size={18} /> Get Current Location
            </button>
            {location.lat && <p className="text-sm text-gray-600">Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>}

            <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg text-center">
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="upload-btn" />
                <label htmlFor="upload-btn" className="cursor-pointer flex flex-col items-center">
                    <Camera size={40} className="text-gray-400" />
                    <span className="text-sm text-gray-500">{image ? image.name : "Select Pothole Image"}</span>
                </label>
            </div>

            <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
            >
                {loading ? <Loader className="animate-spin mx-auto" /> : "Submit Report"}
            </button>

            {status && <p className="text-center font-medium text-blue-600">{status}</p>}
        </div>
    );
};

export default PotholeForm;