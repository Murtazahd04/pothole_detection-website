import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">
            {/* Custom Landing Navbar */}
            <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-[1000] shadow-sm">
                <div className="flex items-center">
                    <h1 className="text-xl font-black tracking-tighter text-slate-900 italic">
                        POTHOLE<span className="text-blue-600">FIX</span>
                    </h1>
                </div>

                {/* Only Login button shown, User name and history removed */}
                <div>
                    <button 
                        onClick={() => navigate('/login')}
                        className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95"
                    >
                        Login
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center flex-grow">
                {/* AI Badge Removed as requested */}
                
                <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter mb-8 italic">
                    ROADS THAT <span className="text-blue-600">THINK.</span>
                </h1>
                
                <p className="max-w-2xl text-slate-500 text-lg mb-12 leading-relaxed font-medium">
                    Integrated YOLOv8 Deep Learning for real-time pothole detection. Report issues in Mumbai, Thane, or Navi Mumbai 
                    and track the municipality's progress in real-time.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-16">
                    <button 
                        onClick={() => navigate('/signup')} 
                        className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                    >
                        Report a Problem
                    </button>
                    <button 
                        onClick={() => navigate('/login')} 
                        className="bg-white text-slate-900 border-2 border-slate-200 px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                    >
                        Admin Portal
                    </button>
                </div>
            </div>

            {/* AI Tech Section */}
            <div className="bg-slate-900 py-20 text-white">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
                    <div className="space-y-4">
                        <div className="text-blue-500 font-mono text-xl">01.</div>
                        <h3 className="text-2xl font-black uppercase italic">Real-time Vision</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Our YOLOv8 model processes citizen uploads to verify pothole presence and count automatically.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="text-blue-500 font-mono text-xl">02.</div>
                        <h3 className="text-2xl font-black uppercase italic">Smart Routing</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Reports are instantly geo-tagged and assigned to the BMC, TMC, or NMMC based on coordinates.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="text-blue-500 font-mono text-xl">03.</div>
                        <h3 className="text-2xl font-black uppercase italic">Visual Proof</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Municipality admins must provide photographic proof of repair to resolve a report.</p>
                    </div>
                </div>
            </div>

            {/* Footer Section */}
            <footer className="bg-white border-t border-slate-100 py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-col items-center md:items-start">
                        <h2 className="text-xl font-black tracking-tighter text-slate-900 italic">
                            POTHOLE<span className="text-blue-600">FIX</span>
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            © 2026 Mumbai University IT Project
                        </p>
                    </div>

                    <div className="flex gap-8">
                        <div className="flex flex-col items-center md:items-start">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Service Areas</span>
                            <div className="flex gap-4">
                                <span className="text-[9px] font-bold text-slate-400 uppercase border border-slate-100 px-3 py-1 rounded-full">BMC</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase border border-slate-100 px-3 py-1 rounded-full">TMC</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase border border-slate-100 px-3 py-1 rounded-full">NMMC</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center md:text-right">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Deep Learning Integrated</p>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter mt-1 italic">Powered by YOLOv8 & React</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;