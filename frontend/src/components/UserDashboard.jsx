import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';

const UserDashboard = () => {
    const [myReports, setMyReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Retrieving session data
    const userId = localStorage.getItem('user_id'); 
    const userName = localStorage.getItem('name') || "ABIZER SAIFEE";
    const userRole = localStorage.getItem('role') || "USER";
    const BACKEND_URL = "http://localhost:5000";

    const fetchMyHistory = async () => {
        try {
            // Fetching user-specific reports
            const res = await axios.get(`${BACKEND_URL}/reports?user_id=${userId}`);
            setMyReports(res.data);
            
            // Notification Badge logic: checks for reports recently marked 'Resolved'
            const resolved = res.data.filter(r => r.status === 'Resolved').length;
            setUnreadCount(resolved);
        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reportId) => {
        if (window.confirm("Delete this report permanently?")) {
            try {
                await axios.delete(`${BACKEND_URL}/reports/${reportId}`);
                setMyReports(myReports.filter(report => report._id !== reportId));
            } catch (err) {
                console.error("Delete error:", err);
            }
        }
    };

    useEffect(() => {
        if (userId) {
            fetchMyHistory();
            const interval = setInterval(fetchMyHistory, 60000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Syncing Data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* --- INTEGRATED NAVBAR --- */}
            <nav className="bg-white border-b border-slate-100 px-8 py-5 flex justify-between items-center sticky top-0 z-[1000] shadow-sm">
                <div className="flex items-center gap-12">
                    {/* Brand Logo */}
                    <div className="cursor-pointer" onClick={() => navigate('/')}>
                        <h1 className="text-2xl font-black tracking-tighter text-slate-900 italic">
                            POTHOLE<span className="text-blue-600">FIX</span>
                        </h1>
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex gap-10">
                        <Link 
                            to="/report" 
                            className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                                location.pathname === '/report' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'
                            }`}
                        >
                            Report Pothole
                        </Link>
                        
                        <Link 
                            to="/history" 
                            className={`relative text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                                location.pathname === '/history' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'
                            }`}
                        >
                            My History
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-4 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 shadow-sm border border-white"></span>
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* User Profile Info */}
                    <div className="hidden sm:flex flex-col items-end mr-4">
                        <span className="text-[11px] font-black text-slate-900 uppercase italic leading-none">{userName}</span>
                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">{userRole}</span>
                    </div>
                    
                    {/* Logout Button */}
                    <button 
                        onClick={handleLogout}
                        className="bg-slate-900 text-white px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-lg shadow-slate-200"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <div className="p-6 md:p-12">
                <header className="mb-14 flex justify-between items-end">
                    <div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase underline decoration-blue-500 decoration-8 underline-offset-[12px]">Report History</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-6 ml-1 italic leading-relaxed">
                            Monitor and track all submitted reports
                        </p>
                    </div>
                    
                    {/* Add Pothole Quick Action */}
                    <button 
                        onClick={() => navigate('/report')}
                        className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                        Report Pothole +
                    </button>
                </header>

                {/* Reports Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {myReports.length === 0 ? (
                        <div className="col-span-full py-24 text-center bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100 shadow-inner">
                            <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-sm">No Active Reports Found</p>
                            <button onClick={() => navigate('/report')} className="mt-4 text-blue-600 font-black text-[11px] uppercase tracking-widest hover:underline">Start your first report</button>
                        </div>
                    ) : (
                        myReports.map((report) => (
                            <div key={report._id} className="bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200/50 border border-white flex flex-col group transition-all hover:translate-y-[-8px]">
                                
                                <div className="relative h-60 flex border-b-[10px] border-slate-50">
                                    <div className="w-1/2 relative">
                                        <img src={`${BACKEND_URL}/${report.image_url}`} alt="Pothole" className="h-full w-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500"/>
                                        <span className="absolute top-4 left-4 bg-slate-900/90 text-white text-[7px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest">Initial Report</span>
                                    </div>
                                    <div className="w-1/2 relative bg-slate-100">
                                        {report.status === 'Resolved' ? (
                                            <>
                                                <img src={`${BACKEND_URL}/${report.resolved_image_url}`} alt="Fixed" className="h-full w-full object-cover"/>
                                                <span className="absolute top-4 right-4 bg-green-500 text-white text-[7px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest shadow-lg shadow-green-200 animate-pulse">Fixed ✅</span>
                                            </>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
                                                <div className="w-9 h-9 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">Syncing With<br/>Municipality</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-10 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-8">
                                        <span className={`text-[10px] font-black px-5 py-2.5 rounded-2xl uppercase tracking-widest border-2 ${
                                            report.status === 'Pending' 
                                            ? 'bg-red-50 text-red-500 border-red-100' 
                                            : 'bg-green-50 text-green-600 border-green-100'
                                        }`}>
                                            {report.status}
                                        </span>
                                        <button onClick={() => handleDelete(report._id)} className="text-slate-200 hover:text-red-500 transition-colors p-1" title="Remove Record">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Geo-Tagged Address</p>
                                        <p className="text-xs text-slate-600 font-bold leading-relaxed line-clamp-2 italic">{report.address || "Fetching exact coordinates..."}</p>
                                    </div>

                                    {report.status === 'Resolved' && (
                                        <div className="mt-auto pt-8 border-t border-slate-50 flex justify-between items-center">
                                            <p className="text-[10px] text-green-600 font-black uppercase tracking-widest italic">Restoration Verified</p>
                                            <span className="text-[9px] font-mono text-slate-300">#{report._id.slice(-6).toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;