import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
    const [location, setLocation] = useState({ lat: 19.0760, lng: 72.8777 }); // Default: Mumbai
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const userId = localStorage.getItem('user_id');
    const userName = localStorage.getItem('name') || "ABIZER SAIFEE";
    const userRole = localStorage.getItem('role') || "USER";
    const BACKEND_URL = "http://localhost:5000";

    // --- REVERSE GEOCODING ---
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

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setImage(file);
        setPreview(URL.createObjectURL(file));
        setIsProcessing(true);

        const tempFormData = new FormData();
        tempFormData.append('image', file);
        try {
            // FIXED: Calls prediction route and sets count strictly from AI
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
            {/* --- INTEGRATED NAVBAR --- */}
            <nav className="bg-white border-b border-slate-100 px-8 py-5 flex justify-between items-center sticky top-0 z-[1000] shadow-sm">
                <div className="flex items-center gap-12">
                    <div className="cursor-pointer" onClick={() => navigate('/')}>
                        <h1 className="text-2xl font-black tracking-tighter text-slate-900 italic">
                            POTHOLE<span className="text-blue-600">FIX</span>
                        </h1>
                    </div>
                    <div className="hidden md:flex gap-10">
                        <Link to="/report" className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${routerLocation.pathname === '/report' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}>Report Pothole</Link>
                        <Link to="/history" className={`text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 transition-all`}>My History</Link>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden sm:flex flex-col items-end mr-4">
                        <span className="text-[11px] font-black text-slate-900 uppercase italic leading-none">{userName}</span>
                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">{userRole}</span>
                    </div>
                    <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="bg-slate-900 text-white px-7 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-black transition-all">Logout</button>
                </div>
            </nav>

            <div className="p-4 md:p-8">
                <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white">
                    
                    {/* --- LEFT PANEL: IMAGE CAPTURE --- */}
                    <div className="md:w-1/2 p-10 border-r border-slate-50">
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
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} required />
                            </div>
                        </div>

                        {/* AI Feedback Badge - Strictly derived from YOLO results */}
                        {(potholeCount >= 0 && preview) && (
                            <div className={`p-5 rounded-2xl flex justify-between items-center shadow-xl transition-all duration-300 ${isProcessing ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white shadow-blue-100'}`}>
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

                    {/* --- RIGHT PANEL: LOCATION & MAP --- */}
                    <div className="md:w-1/2 p-10 flex flex-col bg-slate-50/50">
                        <div className="flex justify-between items-center mb-6 px-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Incident Location</label>
                            <button type="button" onClick={detectMyLocation} className="text-[10px] font-black text-blue-600 uppercase bg-blue-100/50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all">📍 Detect GPS</button>
                        </div>

                        <div className="h-72 rounded-[2rem] overflow-hidden border-4 border-white shadow-lg mb-8 relative z-0">
                            <MapContainer center={[location.lat, location.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <MapEvents />
                            </MapContainer>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md text-white text-[8px] font-black uppercase px-3 py-1 rounded-full tracking-[0.2em] pointer-events-none">Tap map to adjust pin</div>
                        </div>

                        <div className="mb-10">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Verified Address</label>
                            <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-5 bg-white border border-slate-100 rounded-[1.5rem] text-[12px] font-bold text-slate-600 italic outline-none h-28 resize-none shadow-sm" placeholder="Address will populate automatically..." required />
                        </div>

                        <button onClick={handleSubmit} disabled={loading || isProcessing} className={`mt-auto w-full py-6 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${loading || isProcessing ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black shadow-slate-200'}`}>
                            {loading ? "Submitting Report..." : "Finalize & Submit Report"}
                        </button>
                        <button type="button" onClick={() => navigate('/history')} className="mt-4 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all">Cancel Submission</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PotholeForm;