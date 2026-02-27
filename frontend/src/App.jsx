import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard'; 
import UserDashboard from './components/UserDashboard';   
import PotholeForm from './components/PotholeForm';
import Navbar from './components/Navbar';
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
    if (role === 'admin' && !userRole?.includes('admin')) {
        return <Navigate to="/history" />;
    }
    
    // Users trying to access admin routes are sent back to history
    if (role === 'user' && userRole?.includes('admin')) {
        return <Navigate to="/admin" />;
    }
    
    return children;
};

/**
 * Layout component that wraps all routes with the Navbar
 */
const AppLayout = ({ children }) => {
    return (
        <>
            <Navbar />
            {children}
        </>
    );
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Routes with Navbar */}
                <Route path="/" element={
                    <AppLayout>
                        <LandingPage />
                    </AppLayout>
                } />
                
                <Route path="/login" element={
                    <AppLayout>
                        <Login />
                    </AppLayout>
                } />
                
                <Route path="/signup" element={
                    <AppLayout>
                        <Signup />
                    </AppLayout>
                } />
                
                {/* Protected Citizen/User Routes with Navbar */}
                <Route path="/history" element={
                    <PrivateRoute role="user">
                        <AppLayout>
                            <UserDashboard />
                        </AppLayout>
                    </PrivateRoute>
                } />

                <Route path="/report" element={
                    <PrivateRoute role="user">
                        <AppLayout>
                            <PotholeForm />
                        </AppLayout>
                    </PrivateRoute>
                } />
                
                {/* Protected Municipal Admin Route with Navbar */}
                <Route path="/admin" element={
                    <PrivateRoute role="admin">
                        <AppLayout>
                            <AdminDashboard />
                        </AppLayout>
                    </PrivateRoute>
                } />
                
                {/* Fallback: Send unknown or unauthorized links back to Home */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;