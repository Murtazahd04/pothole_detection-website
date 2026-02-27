import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        municipality: 'TMC',
        role: 'user' 
    });
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const BACKEND_URL = "http://localhost:5000";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/signup`, formData);
            if (res.status === 201) {
                alert(`Account successfully created for ${formData.municipality} area! Please log in.`);
                navigate('/login');
            }
        } catch (err) {
            console.error("Signup error:", err);
            alert(err.response?.data?.message || "Signup failed. This email may already be in use.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            {/* Signup Form */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 transition-all hover:shadow-blue-100">
                    
                    {/* Header Section */}
                    <div className="text-center mb-8">
                        <div className="inline-block p-4 bg-slate-900 rounded-3xl mb-4">
                            <span className="text-2xl">🏗️</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Join The Mission</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Help us build safer city roads</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name Field */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1 text-left">Full Name</label>
                            <input 
                                type="text" 
                                placeholder="Abizer Saify" 
                                className="w-full p-4 bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-400 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                required 
                            />
                        </div>

                        {/* Email Field */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1 text-left">Email Address</label>
                            <input 
                                type="email" 
                                placeholder="example@mail.com" 
                                className="w-full p-4 bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-400 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                                required 
                            />
                        </div>

                        {/* Municipality Selection */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1 text-left">Local Municipality</label>
                            <div className="relative">
                                <select 
                                    className="w-full p-4 bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium appearance-none cursor-pointer"
                                    value={formData.municipality}
                                    onChange={(e) => setFormData({...formData, municipality: e.target.value})}
                                    required
                                >
                                    <option value="TMC">Thane Municipal Corporation (TMC)</option>
                                    <option value="BMC">Brihanmumbai Municipal Corp (BMC)</option>
                                    <option value="NMMC">Navi Mumbai Municipal Corp (NMMC)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="pb-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1 text-left">Create Password</label>
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full p-4 bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-400 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                                required 
                            />
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className={`w-full py-4 rounded-2xl text-white font-black text-xs tracking-widest shadow-xl transition-all uppercase ${
                                loading 
                                    ? 'bg-slate-300 animate-pulse' 
                                    : 'bg-slate-900 hover:bg-black shadow-slate-200 active:scale-95'
                            }`}
                        >
                            {loading ? "Creating Account..." : "Register Now"}
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Already a member? <span onClick={() => navigate('/login')} className="text-blue-600 font-bold cursor-pointer hover:underline">Log In</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;