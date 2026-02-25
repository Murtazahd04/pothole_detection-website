import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import PotholeForm from './components/PotholeForm';
import Dashboard from './components/Dashboard';
import 'leaflet/dist/leaflet.css';
const PrivateRoute = ({ children, role }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    
    if (!token) return <Navigate to="/login" />;
    
    // Agar humne 'admin' role manga hai, toh check karo ki userRole mein 'admin' keyword hai ya nahi
    if (role === 'admin' && !userRole.includes('admin')) {
        return <Navigate to="/report" />;
    }
    
    return children;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                {/* User Page */}
                <Route path="/report" element={
                    <PrivateRoute role="user">
                        <PotholeForm />
                    </PrivateRoute>
                } />
                
                {/* Admin Page */}
                <Route path="/admin" element={
                    <PrivateRoute role="admin">
                        <Dashboard />
                    </PrivateRoute>
                } />
                
                <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;