import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';
import L from 'leaflet';

// --- LEAFLET CSS & ICON FIX ---
import 'leaflet/dist/leaflet.css';
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

const Dashboard = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 1. Get User Info from LocalStorage
    const userRole = localStorage.getItem('role') || 'default';
    const BACKEND_URL = "http://localhost:5000";

    // 2. Map Configuration based on Municipality
    const mapConfigs = {
        'admin-tmc': { center: [19.2183, 72.9781], zoom: 13, name: "Thane Municipal Corporation" },
        'admin-bmc': { center: [19.0760, 72.8777], zoom: 12, name: "Brihanmumbai Municipal Corp" },
        'default': { center: [19.15, 72.9], zoom: 11, name: "General Monitoring" }
    };

    const currentConfig = mapConfigs[userRole] || mapConfigs['default'];

    // 3. Fetch Filtered Reports
    const fetchReports = async () => {
        try {
            // Hum backend ko role bhej rahe hain taaki wo wahi ka data de
            const res = await axios.get(`${BACKEND_URL}/reports?role=${userRole}`);
            setReports(res.data);
        } catch (err) {
            console.error("Data fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [userRole]);

    // 4. Mark as Fixed Logic
    const handleResolve = async (id) => {
        try {
            const response = await axios.patch(`${BACKEND_URL}/update_status/${id}`);
            if (response.status === 200) {
                alert("Pothole status updated! ✅");
                fetchReports(); 
            }
        } catch (err) {
            alert("Failed to update status.");
        }
    };

    // 5. Analytics Calculations
    const pendingCount = reports.filter(r => r.status === 'Pending').length;
    const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
    const chartData = [
        { name: 'Pending', value: pendingCount },
        { name: 'Resolved', value: resolvedCount },
    ];
    const COLORS = ['#EF4444', '#22C55E'];

    if (loading) return <div className="p-10 text-center font-bold text-xl">Loading {currentConfig.name} Data...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-slate-900 text-white p-5 shadow-lg flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black tracking-tighter">POTHOLE ADMIN</h1>
                    <p className="text-xs text-blue-400 font-bold uppercase">{currentConfig.name}</p>
                </div>
                <button 
                    onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                >
                    Logout
                </button>
            </header>

            <div className="p-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-blue-500">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reports in Area</p>
                        <p className="text-4xl font-black text-gray-800">{reports.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-red-500">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending Repairs</p>
                        <p className="text-4xl font-black text-red-600">{pendingCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-green-500">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Success Rate</p>
                        <p className="text-4xl font-black text-green-600">
                            {reports.length > 0 ? Math.round((resolvedCount/reports.length)*100) : 0}%
                        </p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Visual Analytics */}
                    <div className="lg:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-h-[450px]">
                        <h2 className="text-lg font-bold text-gray-700 mb-6">Repair Progress</h2>
                        <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 text-center text-sm text-gray-500 italic">
                            Real-time data for {userRole.split('-')[1]?.toUpperCase() || 'Admin'}
                        </div>
                    </div>

                    {/* Restricted Map View */}
                    <div className="lg:w-2/3 h-[500px] rounded-2xl shadow-xl overflow-hidden border-4 border-white">
                        <MapContainer
                            key={`${currentConfig.center[0]}-${userRole}`} // Role change hone par map re-center hoga
                            center={currentConfig.center} 
                            zoom={currentConfig.zoom}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                            {reports.map((report) => (
                                <Marker
                                    key={report._id}
                                    position={[parseFloat(report.coordinates.lat), parseFloat(report.coordinates.lng)]}
                                >
                                    <Popup>
                                        <div className="p-2 min-w-[200px]">
                                            <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Pothole Location</p>
                                            <p className="text-sm font-medium text-gray-800 mb-3 leading-tight">
                                                {report.address || "Fetching address..."}
                                            </p>
                                            
                                            <div className="flex justify-between items-center mb-4 bg-gray-50 p-2 rounded-lg">
                                                <span className="text-xs font-bold">Status:</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${report.status === 'Pending' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {report.status}
                                                </span>
                                            </div>

                                            {report.status === 'Pending' && (
                                                <button
                                                    onClick={() => handleResolve(report._id)}
                                                    className="w-full bg-slate-800 hover:bg-black text-white py-2 rounded-lg text-xs font-bold transition-all shadow-md"
                                                >
                                                    MARK AS FIXED
                                                </button>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;