import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        municipality: 'TMC', // Default selection
        role: 'user' 
    });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Check karein ki municipality selected hai
            if (!formData.municipality) {
                alert("Please select a municipality!");
                return;
            }

            const res = await axios.post('http://localhost:5000/signup', formData);
            if (res.status === 201) {
                alert(`Account created for ${formData.municipality} area! Please login.`);
                navigate('/login');
            }
        } catch (err) {
            alert(err.response?.data?.message || "Signup failed.");
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-black text-gray-800">Sign Up</h2>
                    <p className="text-gray-500 text-sm mt-2">Register to your local municipality</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Field */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Full Name</label>
                        <input type="text" placeholder="Enter Name" className="w-full p-3 bg-gray-50 border rounded-xl outline-none"
                            onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                        <input type="email" placeholder="email@example.com" className="w-full p-3 bg-gray-50 border rounded-xl outline-none"
                            onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                    </div>

                    {/* Municipality Dropdown (Naya badlav yahan hai) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select Municipality</label>
                        <select 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                            value={formData.municipality}
                            onChange={(e) => setFormData({...formData, municipality: e.target.value})}
                            required
                        >
                            <option value="TMC">Thane Municipal Corporation (TMC)</option>
                            <option value="BMC">Brihanmumbai Municipal Corp (BMC)</option>
                            <option value="NMMC">Navi Mumbai Municipal Corp (NMMC)</option>
                        </select>
                    </div>

                    {/* Password Field */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
                        <input type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 border rounded-xl outline-none"
                            onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                        Create Account
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account? <span onClick={() => navigate('/login')} className="text-blue-600 font-bold cursor-pointer">Log In</span>
                </p>
            </div>
        </div>
    );
};

export default Signup;