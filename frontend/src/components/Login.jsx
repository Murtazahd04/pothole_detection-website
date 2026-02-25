import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const navigate = useNavigate();
const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const res = await axios.post('http://localhost:5000/login', formData);
        
        // Data save karein
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role);
        
        console.log("Login Success! Role:", res.data.role);

        // Redirect Logic: Check if role starts with 'admin-'
        if (res.data.role.includes('admin')) {
            navigate('/admin'); // Dashboard page par bhejo
        } else {
            navigate('/report'); // Pothole form par bhejo
        }
    } catch (err) {
        console.error(err);
        alert("Login failed! Check console.");
    }
};
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <form onSubmit={handleSubmit} className="p-8 bg-white shadow-xl rounded-lg w-96">
                <h2 className="text-2xl font-bold mb-6">Login</h2>
                <input type="email" placeholder="Email" className="w-full p-2 mb-4 border rounded" 
                       onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                <input type="password" placeholder="Password" className="w-full p-2 mb-6 border rounded" 
                       onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Login</button>
                <p className="mt-4 text-sm">Don't have an account? <span onClick={() => navigate('/signup')} className="text-blue-500 cursor-pointer">Sign Up</span></p>
            </form>
        </div>
    );
};
export default Login;