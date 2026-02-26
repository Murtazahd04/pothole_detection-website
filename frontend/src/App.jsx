import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard'; 
import UserDashboard from './components/UserDashboard';   
import PotholeForm from './components/PotholeForm';
import 'leaflet/dist/leaflet.css';

/**
 * PrivateRoute Component
 * Secures routes by checking for a valid JWT token and matching user roles.
 */
const PrivateRoute = ({ children, role }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    
    // Redirect to login if no session token is found
    if (!token) return <Navigate to="/login" />;
    
    // Role-Based Access Control: Admins stay on /admin, Users stay on /history
    if (role === 'admin' && !userRole.includes('admin')) {
        return <Navigate to="/history" />;
    }
    
    // Users trying to access admin routes are sent back to history
    if (role === 'user' && userRole.includes('admin')) {
        return <Navigate to="/admin" />;
    }
    
    return children;
};

function App() {
    return (
        <BrowserRouter>
            {/* Global Navbar is removed to favor the integrated headers in Dashboards.
                This prevents the "Double Navbar" issue seen in previous versions.
            */}
            
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} /> 
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                {/* --- Protected Citizen/User Routes --- */}
                
                {/* 1. User History (Starting Dashboard) */}
                <Route path="/history" element={
                    <PrivateRoute role="user">
                        <UserDashboard />
                    </PrivateRoute>
                } />

                {/* 2. Report Form (Accessible from Dashboard) */}
                <Route path="/report" element={
                    <PrivateRoute role="user">
                        <PotholeForm />
                    </PrivateRoute>
                } />
                
                {/* --- Protected Municipal Admin Route --- */}
                <Route path="/admin" element={
                    <PrivateRoute role="admin">
                        <AdminDashboard />
                    </PrivateRoute>
                } />
                
                {/* Fallback: Send unknown or unauthorized links back to Home */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;