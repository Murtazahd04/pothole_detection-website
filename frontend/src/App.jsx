import React from 'react';
import PotholeForm from './components/PotholeForm';
import Dashboard from './components/Dashboard';
import 'leaflet/dist/leaflet.css';
function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 p-4 text-white shadow-md mb-6">
        <h1 className="text-xl font-bold text-center">Pothole Management System</h1>
      </nav>

      <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Citizen Upload Form */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Citizen Portal</h2>
          <PotholeForm />
        </div>

        {/* Right Side: Admin Dashboard */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Admin View</h2>
          <Dashboard />
        </div>
      </div>
    </div>
  );
}

export default App;