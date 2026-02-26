import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);
    
    // Retrieve session data stored during login
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('user_id');
    const name = localStorage.getItem('name') || "User";
    const BACKEND_URL = "http://localhost:5000";

    useEffect(() => {
        // Only citizens (users) need notifications for resolved reports
        if (role === 'user' && userId) {
            const checkNotifications = async () => {
                try {
                    // Fetching reports specifically for this user to check status
                    const res = await axios.get(`${BACKEND_URL}/reports?user_id=${userId}`);
                    
                    // Count how many potholes have been marked 'Resolved' by the admin
                    const resolvedReports = res.data.filter(r => r.status === 'Resolved').length;
                    setUnreadCount(resolvedReports); 
                } catch (err) {
                    console.error("Notification fetch error:", err);
                }
            };
            
            checkNotifications();
            
            // Set up an interval to check for municipality updates every 60 seconds
            const interval = setInterval(checkNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [role, userId]);

    const handleLogout = () => {
        // Clear session and redirect to login
        localStorage.clear();
        navigate('/login');
    };

    return (
        <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-[1000] shadow-sm font-sans">
            <div className="flex items-center gap-8">
                {/* Brand Logo */}
                <h1 
                    className="text-xl font-black tracking-tighter text-slate-900 italic cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    POTHOLE<span className="text-blue-600">FIX</span>
                </h1>
                
                {/* Role-Based Navigation Links */}
                <div className="hidden md:flex gap-6">
                    {role?.includes('admin') ? (
                        <Link 
                            to="/admin" 
                            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                location.pathname === '/admin' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'
                            }`}
                        >
                            Admin Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link 
                                to="/report" 
                                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                    location.pathname === '/report' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'
                                }`}
                            >
                                Report Pothole
                            </Link>
                            
                            {/* History Link with Tailwind Notification Badge */}
                            <Link 
                                to="/history" 
                                className={`relative text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                    location.pathname === '/history' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'
                                }`}
                            >
                                My History
                                {unreadCount > 0 && (
                                    <span className="absolute -top-2 -right-4 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 shadow-sm"></span>
                                    </span>
                                )}
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* User Profile & Logout Section */}
            <div className="flex items-center gap-6">
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter italic leading-none">
                        {name}
                    </span>
                    <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                        {role?.replace('admin-', '').toUpperCase()}
                    </span>
                </div>
                
                <button 
                    onClick={handleLogout}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95"
                >
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default Navbar;