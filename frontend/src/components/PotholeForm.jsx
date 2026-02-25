import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PotholeForm = () => {
    // 1. States define karein
    const [image, setImage] = useState(null); // Ye 'selectedFile' ki jagah hai
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);

    // 2. Component load hote hi location maangein
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => console.error("Location Error:", err)
            );
        }
    }, []);

    // 3. Image select handler
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setImage(file);
        setPreview(URL.createObjectURL(file)); // Image preview dikhane ke liye
    };

    // 4. Submit handler (With Auth Token)
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!image || !location.lat) {
            alert("Please select an image and allow location access.");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert("Session expired. Please login again.");
            window.location.href = '/login';
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('image', image); // Yahan 'image' state use ho rahi hai
        formData.append('lat', location.lat);
        formData.append('lng', location.lng);

        try {
            const response = await axios.post('http://localhost:5000/predict', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-access-token': token // Token bhejna zaroori hai
                }
            });

            console.log("Success:", response.data);
            alert(`Pothole Reported! Count: ${response.data.pothole_count} in ${response.data.municipality}`);
            
            // Form Reset karein
            setImage(null);
            setPreview(null);
        } catch (error) {
            console.error("Upload error:", error);
            const errorMsg = error.response?.data?.message || "Something went wrong";
            alert("Error: " + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-black text-gray-800 mb-6 text-center italic">REPORT POTHOLE</h2>
                
                {/* Image Upload Area */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Upload Photo</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                        {preview ? (
                            <img src={preview} alt="Preview" className="h-48 w-full object-cover rounded-lg mb-4" />
                        ) : (
                            <div className="py-8 text-gray-400 text-sm">No image selected</div>
                        )}
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                    </div>
                </div>

                {/* Location Display */}
                <div className="bg-blue-50 p-4 rounded-xl mb-6">
                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">Your Location</p>
                    {location.lat ? (
                        <p className="text-sm font-mono text-blue-800">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
                    ) : (
                        <p className="text-xs text-red-500 animate-pulse font-bold">Waiting for GPS...</p>
                    )}
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full py-4 rounded-xl text-white font-black transition-all shadow-lg ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {loading ? "ANALYZING IMAGE..." : "SUBMIT REPORT"}
                </button>
            </form>
        </div>
    );
};

export default PotholeForm;