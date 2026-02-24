import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';

// --- LEAFLET CSS & ICON FIX ---
// Agar npm se install kiya hai toh ye line zaroori hai
import 'leaflet/dist/leaflet.css'; 

// Icons manually define kar rahe hain taaki "pinpoint" gayab na ho
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;
// ------------------------------

const Dashboard = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const BACKEND_URL = "http://localhost:5000"; 

    // 1. Data Fetching
    const fetchReports = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/reports`);
            setReports(res.data);
        } catch (err) {
            console.error("Data fetch error (Check if Flask is running):", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    // 2. Status Update (Resolve)
    const handleResolve = async (id) => {
        try {
            await axios.patch(`${BACKEND_URL}/update_status/${id}`);
            alert("Report Marked as Resolved! ✅");
            fetchReports(); // Refresh data
        } catch (err) {
            alert("Error updating status");
        }
    };

    if (loading) return <div className="p-10 text-center font-bold">Connecting to Database...</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Top Navigation Bar */}
            <nav className="bg-slate-800 text-white p-4 shadow-lg flex justify-between items-center">
                <h1 className="text-xl font-bold">Pothole Monitoring Dashboard</h1>
                <div className="flex gap-4">
                    <div className="bg-red-500 px-3 py-1 rounded text-sm font-semibold">
                        Pending: {reports.filter(r => r.status === 'Pending').length}
                    </div>
                    <div className="bg-green-500 px-3 py-1 rounded text-sm font-semibold">
                        Resolved: {reports.filter(r => r.status === 'Resolved').length}
                    </div>
                </div>
            </nav>

            {/* Map Section */}
            <div className="flex-grow relative">
                <MapContainer 
                    center={[19.2183, 72.9781]} // Thane default
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    
                    {reports.map((report) => (
                        <Marker 
                            key={report._id} 
                            // parseFloat zaroori hai taaki marker sahi coordinate par baithe
                            position={[
                                parseFloat(report.coordinates.lat), 
                                parseFloat(report.coordinates.lng)
                            ]}
                        >
                            <Popup className="w-64">
                                <div className="p-2">
                                    {/* Local Image Display */}
                                    <img 
                                        src={`${BACKEND_URL}/${report.image_url}`} 
                                        alt="Pothole proof" 
                                        className="w-full h-32 object-cover rounded-md mb-2 border shadow-sm"
                                        onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=Image+Not+Found"; }}
                                    />
                                    <div className="space-y-1">
                                        <p className="font-bold text-gray-800">Count: {report.pothole_count}</p>
                                        <p className="text-[10px] text-gray-500 italic">📍 {report.address || "Area location captured"}</p>
                                        <p className={`text-xs font-bold uppercase ${report.status === 'Pending' ? 'text-red-500' : 'text-green-500'}`}>
                                            Status: {report.status}
                                        </p>
                                        
                                        {report.status === 'Pending' && (
                                            <button 
                                                onClick={() => handleResolve(report._id)}
                                                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs transition"
                                            >
                                                Mark as Fixed
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-gray-400 mt-2 text-right">
                                        {new Date(report.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default Dashboard;