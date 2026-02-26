import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import axios from 'axios';
import L from 'leaflet';

// --- LEAFLET CSS & ICON FIX ---
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
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

const AdminDashboard = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showResolveCenter, setShowResolveCenter] = useState(false); // Toggle for view
    
    const userRole = localStorage.getItem('role') || 'default';
    const BACKEND_URL = "http://localhost:5000";

    const mapConfigs = {
        'admin-tmc': { center: [19.2183, 72.9781], zoom: 13, name: "Thane Municipal Corporation" },
        'admin-bmc': { center: [19.0760, 72.8777], zoom: 12, name: "Brihanmumbai Municipal Corp" },
        'default': { center: [19.15, 72.9], zoom: 11, name: "General Monitoring" }
    };

    const currentConfig = mapConfigs[userRole] || mapConfigs['default'];

    const fetchReports = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/reports?role=${userRole}`);
            setReports(res.data);
        } catch (err) {
            console.error("Data fetch error:", err);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [userRole]);

    const handleResolve = async (id) => {
        const fileInput = document.getElementById(`file-${id}`);
        const file = fileInput?.files[0];
        if (!file) { alert("Please upload a photo of the fixed road first!"); return; }

        const formData = new FormData();
        formData.append('resolved_image', file);

        try {
            setLoading(true);
            const response = await axios.patch(`${BACKEND_URL}/update_status/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.status === 200) {
                alert("Success: Verified by AI and marked as Resolved! ✅");
                fetchReports(); 
            }
        } catch (err) {
            alert(err.response?.data?.error || "AI Audit failed: Potholes detected.");
        } finally { setLoading(false); }
    };

    // --- LOGIC: DATA FILTERING ---
    const pendingReports = reports.filter(r => r.status === 'Pending');
    const resolvedReports = reports.filter(r => r.status === 'Resolved');

    const chartData = [
        { name: 'Pending', value: pendingReports.length },
        { name: 'Resolved', value: resolvedReports.length },
    ];
    const COLORS = ['#EF4444', '#22C55E'];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            {/* Header Section */}
            <header className="bg-slate-900 text-white p-5 shadow-lg flex justify-between items-center sticky top-0 z-[2000]">
                <div>
                    <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">Pothole Admin</h1>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">{currentConfig.name}</p>
                </div>
                
                <div className="flex gap-4">
                    <button 
                        onClick={() => setShowResolveCenter(!showResolveCenter)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            showResolveCenter ? 'bg-white text-slate-900' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        }`}
                    >
                        {showResolveCenter ? "← Back to Live Map" : "Open Resolve Center"}
                    </button>
                    <button 
                        onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                        className="bg-red-600/10 text-red-500 border border-red-600/20 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {!showResolveCenter ? (
                /* --- VIEW 1: LIVE MONITORING MAP (PENDING ONLY) --- */
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-blue-500">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Registered</p>
                            <p className="text-4xl font-black text-slate-900">{reports.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-red-500">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Pins on Map</p>
                            <p className="text-4xl font-black text-red-600">{pendingReports.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-green-500">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Audit Success</p>
                            <p className="text-4xl font-black text-green-600">{resolvedReports.length}</p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="lg:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 w-full text-left">Repair Analytics</h2>
                            <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="lg:w-2/3 h-[550px] relative z-0 rounded-3xl shadow-xl overflow-hidden border-8 border-white">
                            <MapContainer center={currentConfig.center} zoom={currentConfig.zoom} style={{ height: '550px', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <MarkerClusterGroup chunkedLoading>
                                    {/* Pins are strictly removed if Resolved */}
                                    {pendingReports.map((report) => (
                                        <Marker key={report._id} position={[parseFloat(report.coordinates?.lat || 0), parseFloat(report.coordinates?.lng || 0)]}>
                                            <Popup minWidth={280}>
                                                <div className="p-1 font-sans">
                                                    <div className="relative h-32 w-full mb-3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                        <img src={`${BACKEND_URL}/${report.image_url}`} alt="Pothole" className="w-full h-full object-cover" />
                                                        <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">Issue Detected</span>
                                                    </div>
                                                    <div className="space-y-2 mb-4">
                                                        <p className="text-[11px] font-bold text-slate-700 leading-tight">{report.address}</p>
                                                    </div>
                                                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                                        <input type="file" id={`file-${report._id}`} accept="image/*" className="text-[9px] w-full" />
                                                        <button onClick={() => handleResolve(report._id)} disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                                                            {loading ? "AI Auditing..." : "Verify & Fix"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MarkerClusterGroup>
                            </MapContainer>
                        </div>
                    </div>
                </div>
            ) : (
                /* --- VIEW 2: RESOLVE CENTER (BEFORE vs AFTER) --- */
                <div className="p-10 flex-1 overflow-y-auto">
                    <div className="mb-10">
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase underline decoration-green-500 decoration-8 underline-offset-[12px]">Resolve Center</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-6 italic">Verified Repair History & AI Verification Logs</p>
                    </div>

                    <div className="grid grid-cols-1 gap-12">
                        {resolvedReports.length === 0 ? (
                            <div className="py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                                <p className="text-slate-300 font-black uppercase tracking-[0.4em]">No Resolved Potholes found in this region</p>
                            </div>
                        ) : (
                            resolvedReports.map((report) => (
                                <div key={report._id} className="bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200 border border-white p-10 group transition-all hover:scale-[1.01]">
                                    <div className="flex flex-col lg:flex-row gap-10">
                                        {/* Comparison Images */}
                                        <div className="lg:w-2/3 flex gap-4 h-80">
                                            <div className="w-1/2 relative rounded-[2rem] overflow-hidden">
                                                <img src={`${BACKEND_URL}/${report.image_url}`} className="w-full h-full object-cover grayscale-[0.3]" alt="Before" />
                                                <span className="absolute top-4 left-4 bg-red-600/90 backdrop-blur-md text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Before</span>
                                            </div>
                                            <div className="w-1/2 relative rounded-[2rem] overflow-hidden border-4 border-green-500/20">
                                                <img src={`${BACKEND_URL}/${report.resolved_image_url}`} className="w-full h-full object-cover" alt="After" />
                                                <span className="absolute top-4 left-4 bg-green-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">After (Fixed)</span>
                                            </div>
                                        </div>

                                        {/* Repair Meta Details */}
                                        <div className="lg:w-1/3 flex flex-col justify-center space-y-6">
                                            <div>
                                                <span className="bg-green-50 text-green-600 text-[10px] font-black px-4 py-1 rounded-full uppercase border border-green-100">AI Verified Clean Road</span>
                                                <h3 className="text-xl font-black text-slate-900 mt-4 leading-tight">{report.address}</h3>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">👤</div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Reported By</p>
                                                        <p className="text-xs font-bold text-slate-700">{report.user_name || "Citizen"}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">📅</div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Completion Date</p>
                                                        <p className="text-xs font-bold text-slate-700">{new Date(report.resolved_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-6 border-t border-slate-50 flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <p className="text-[8px] font-black text-green-600 uppercase tracking-widest italic">Resolved status synchronized with central database</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;