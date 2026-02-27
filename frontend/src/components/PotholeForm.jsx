import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

// --- LEAFLET ICON FIX ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const PotholeForm = () => {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [potholeCount, setPotholeCount] = useState(0);
    const [location, setLocation] = useState({ lat: 19.0760, lng: 72.8777 });
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id');
    const userName = localStorage.getItem('name') || "ABIZER SAIFEE";
    const BACKEND_URL = "http://localhost:5000";

    const updateAddress = async (lat, lng) => {
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            setAddress(res.data.display_name);
        } catch (err) {
            setAddress("Coordinates captured at: " + lat + ", " + lng);
        }
    };

    const MapEvents = () => {
        useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng;
                setLocation({ lat, lng });
                updateAddress(lat, lng);
            },
        });
        return location.lat ? <Marker position={[location.lat, location.lng]} icon={DefaultIcon} /> : null;
    };

    const detectMyLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude, lng: longitude });
                updateAddress(latitude, longitude);
            });
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    // Search location function
    const searchLocation = async (query) => {
        if (!query.trim()) {
            setSearchSuggestions([]);
            return;
        }

        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: query,
                    format: 'json',
                    limit: 5,
                    'accept-language': 'en'
                }
            });
            setSearchSuggestions(res.data);
            setShowSuggestions(true);
        } catch (err) {
            console.error("Search error:", err);
            setSearchSuggestions([]);
        }
    };

    const handleSearchInput = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length > 2) {
            searchLocation(query);
        } else {
            setSearchSuggestions([]);
        }
    };

    const selectSuggestion = (suggestion) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        setLocation({ lat, lng });
        setAddress(suggestion.display_name);
        setSearchQuery(suggestion.display_name);
        setShowSuggestions(false);
        setSearchSuggestions([]);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setImage(file);
        setPreview(URL.createObjectURL(file));
        setIsProcessing(true);

        const tempFormData = new FormData();
        tempFormData.append('image', file);
        try {
            const res = await axios.post(`${BACKEND_URL}/predict`, tempFormData);
            setPotholeCount(res.data.pothole_count); 
        } catch (err) {
            console.error("AI inference error");
            setPotholeCount(0); 
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!image || !location.lat) {
            alert("Please provide both an evidence photo and a location.");
            return;
        }

        const formData = new FormData();
        formData.append('image', image);
        formData.append('user_id', userId);
        formData.append('user_name', userName);
        formData.append('latitude', location.lat);
        formData.append('longitude', location.lng);
        formData.append('address', address);

        try {
            setLoading(true);
            const res = await axios.post(`${BACKEND_URL}/report`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.status === 201) {
                alert("Report submitted! View progress in History. ✅");
                navigate('/history');
            }
        } catch (err) {
            alert("Submission failed. Check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <div className="p-4 md:p-8">
                <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white">
                    
                    {/* LEFT PANEL: IMAGE CAPTURE */}
                    <div className="md:w-1/2 p-10 border-r border-slate-100">
                        <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-10">Report Pothole</h2>
                        
                        <div className="mb-8">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Upload Evidence</label>
                            <div className="relative h-80 bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-100 flex items-center justify-center overflow-hidden hover:border-blue-100 transition-all group">
                                {preview ? (
                                    <img src={preview} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="text-center p-6">
                                        <span className="text-6xl opacity-10">📸</span>
                                        <p className="text-[11px] font-bold text-slate-300 uppercase mt-6 tracking-widest leading-relaxed">Tap to take photo or<br/>choose from gallery</p>
                                    </div>
                                )}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} required accept="image/*" />
                            </div>
                        </div>

                        {/* AI Feedback Badge */}
                        {(potholeCount >= 0 && preview) && (
                            <div className={`p-5 rounded-2xl flex justify-between items-center shadow-xl transition-all duration-300 ${
                                isProcessing 
                                    ? 'bg-slate-100 text-slate-400' 
                                    : 'bg-blue-600 text-white'
                            }`}>
                                <span className="text-[11px] font-black uppercase tracking-widest">
                                    {isProcessing ? "AI analyzing road..." : "YOLOv8 Vision Status:"}
                                </span>
                                {!isProcessing && (
                                    <span className="bg-white text-blue-600 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tighter">
                                        {potholeCount} {potholeCount === 1 ? 'Pothole' : 'Potholes'} Detected
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RIGHT PANEL: LOCATION & MAP */}
                    <div className="md:w-1/2 p-10 flex flex-col bg-slate-50/50">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Incident Location</label>
                            <button 
                                type="button" 
                                onClick={detectMyLocation} 
                                className="text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all bg-blue-100/50 text-blue-600 hover:bg-blue-100"
                            >
                                📍 Detect GPS
                            </button>
                        </div>

                        {/* Location Search Bar */}
                        <div className="mb-4 relative">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search for a location..."
                                    value={searchQuery}
                                    onChange={handleSearchInput}
                                    onFocus={() => searchQuery.length > 2 && setShowSuggestions(true)}
                                    className="w-full p-4 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium pr-10"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Search Suggestions Dropdown */}
                            {showSuggestions && searchSuggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                                    {searchSuggestions.map((suggestion, index) => (
                                        <div
                                            key={index}
                                            onClick={() => selectSuggestion(suggestion)}
                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                                        >
                                            <p className="text-xs font-medium text-slate-700">{suggestion.display_name}</p>
                                            <p className="text-[9px] text-slate-400 mt-1">
                                                {suggestion.type} • {suggestion.class}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="h-72 rounded-[2rem] overflow-hidden border-4 border-white shadow-lg mb-8 relative z-0">
                            <MapContainer center={[location.lat, location.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <MapEvents />
                            </MapContainer>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md text-white text-[8px] font-black uppercase px-3 py-1 rounded-full tracking-[0.2em] pointer-events-none">
                                Tap map to adjust pin
                            </div>
                        </div>

                        <div className="mb-10">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Verified Address</label>
                            <textarea 
                                value={address} 
                                onChange={(e) => setAddress(e.target.value)} 
                                className="w-full p-5 bg-white border border-slate-100 text-slate-600 placeholder-slate-400 rounded-[1.5rem] text-[12px] font-bold italic outline-none h-28 resize-none shadow-sm" 
                                placeholder="Address will populate automatically..." 
                                required 
                            />
                        </div>

                        <button 
                            onClick={handleSubmit} 
                            disabled={loading || isProcessing} 
                            className={`mt-auto w-full py-6 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${
                                loading || isProcessing 
                                    ? 'bg-slate-300 text-white cursor-not-allowed' 
                                    : 'bg-slate-900 hover:bg-black text-white shadow-slate-200'
                            }`}
                        >
                            {loading ? "Submitting Report..." : "Finalize & Submit Report"}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => navigate('/history')} 
                            className="mt-4 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all"
                        >
                            Cancel Submission
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PotholeForm;