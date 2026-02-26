import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false); 
    const [recoveryData, setRecoveryData] = useState({ email: '', answer: '', newPassword: '' });
    
    const navigate = useNavigate();
    const BACKEND_URL = "http://localhost:5000";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // 1. Clear old session data to prevent role-leakage
        localStorage.clear();

        try {
            const res = await axios.post(`${BACKEND_URL}/login`, formData);
            
            // 2. Save fresh session data
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('role', res.data.role);
            localStorage.setItem('user_id', res.data.user_id);
            localStorage.setItem('name', res.data.name);

            console.log("Login Success! Role:", res.data.role);

            // 3. CORRECTED REDIRECT LOGIC
            // We use toLowerCase() to ensure the check is not case-sensitive
            if (res.data.role.toLowerCase().includes('admin')) {
                navigate('/admin');
            } else {
                // Regular users (citizens) go to their history dashboard first
                navigate('/history'); 
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Login failed! Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleRecovery = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await axios.post(`${BACKEND_URL}/reset-password`, recoveryData);
            alert("Password updated successfully! Please login.");
            setShowForgot(false);
        } catch (err) {
            alert(err.response?.data?.message || "Recovery failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 transition-all hover:shadow-blue-100">
                
                <div className="text-center mb-10">
                    <div className="inline-block p-4 bg-blue-50 rounded-3xl mb-4">
                        <span className="text-2xl">{showForgot ? '🔑' : '📍'}</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">
                        {showForgot ? 'Recover Account' : 'Welcome Back'}
                    </h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 italic">Pothole Management System</p>
                </div>

                {!showForgot ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-left">Email Address</label>
                            <input 
                                type="email" 
                                placeholder="name@example.com" 
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                                required 
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center px-1 mb-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                                <span 
                                    onClick={() => setShowForgot(true)}
                                    className="text-[9px] font-black text-blue-600 cursor-pointer hover:underline uppercase tracking-tighter"
                                >
                                    Forgot?
                                </span>
                            </div>
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                                required 
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl text-white font-black text-xs tracking-[0.2em] transition-all shadow-xl shadow-blue-100 uppercase ${
                                loading ? 'bg-slate-300 animate-pulse' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                            }`}
                        >
                            {loading ? "Verifying..." : "Login to Account"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRecovery} className="space-y-4">
                        <input 
                            type="email" 
                            placeholder="Confirm your email" 
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                            onChange={(e) => setRecoveryData({...recoveryData, email: e.target.value})}
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="Security Answer (lowercase)" 
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                            onChange={(e) => setRecoveryData({...recoveryData, answer: e.target.value.toLowerCase()})}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Enter New Password" 
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                            onChange={(e) => setRecoveryData({...recoveryData, newPassword: e.target.value})}
                            required
                        />
                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={() => setShowForgot(false)}
                                className="w-1/3 py-4 rounded-2xl bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest"
                            >
                                Back
                            </button>
                            <button 
                                type="submit"
                                className="w-2/3 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl"
                            >
                                Reset Password
                            </button>
                        </div>
                    </form>
                )}

                {!showForgot && (
                    <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        New User? <span onClick={() => navigate('/signup')} className="text-blue-600 cursor-pointer hover:underline">Create Account</span>
                    </p>
                )}
            </div>
        </div>
    );
};

export default Login;