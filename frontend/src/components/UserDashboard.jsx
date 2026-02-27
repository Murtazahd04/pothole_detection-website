import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const UserDashboard = () => {
    const [myReports, setMyReports] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const navigate = useNavigate();
    
    const userId = localStorage.getItem('user_id'); 
    const BACKEND_URL = "http://localhost:5000";

    const fetchMyHistory = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/reports?user_id=${userId}`);
            setMyReports(res.data);
        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reportId) => {
        if (window.confirm("Delete this report permanently?")) {
            try {
                await axios.delete(`${BACKEND_URL}/reports/${reportId}`);
                setMyReports(myReports.filter(report => report._id !== reportId));
            } catch (err) {
                console.error("Delete error:", err);
            }
        }
    };

    useEffect(() => {
        if (userId) {
            fetchMyHistory();
            const interval = setInterval(fetchMyHistory, 60000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Syncing Data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <div className="p-6 md:p-12">
                <header className="mb-14 flex justify-between items-end">
                    <div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase underline decoration-blue-500 decoration-8 underline-offset-[12px]">
                            Report History
                        </h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-6 ml-1 italic leading-relaxed">
                            Monitor and track all submitted reports
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/report')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-blue-200 active:scale-95 transition-all"
                    >
                        Report Pothole +
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {myReports.length === 0 ? (
                        <div className="col-span-full py-24 text-center bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100 shadow-inner">
                            <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-sm">No Active Reports Found</p>
                            <button onClick={() => navigate('/report')} className="mt-4 text-blue-600 font-black text-[11px] uppercase tracking-widest hover:underline">Start your first report</button>
                        </div>
                    ) : (
                        myReports.map((report) => (
                            <div key={report._id} className="bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200/50 border border-white flex flex-col group transition-all hover:translate-y-[-8px]">
                                
                                <div className="relative h-60 flex border-b-[10px] border-slate-50">
                                    <div className="w-1/2 relative">
                                        <img src={`${BACKEND_URL}/${report.image_url}`} alt="Pothole" className="h-full w-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500"/>
                                        <span className="absolute top-4 left-4 bg-slate-900/90 text-white text-[7px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest">Initial Report</span>
                                    </div>
                                    <div className="w-1/2 relative bg-slate-100">
                                        {report.status === 'Resolved' ? (
                                            <>
                                                <img src={`${BACKEND_URL}/${report.resolved_image_url}`} alt="Fixed" className="h-full w-full object-cover"/>
                                                <span className="absolute top-4 right-4 bg-green-500 text-white text-[7px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest shadow-lg shadow-green-200 animate-pulse">Fixed ✅</span>
                                            </>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
                                                <div className="w-9 h-9 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">Syncing With<br/>Municipality</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-10 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-8">
                                        <span className={`text-[10px] font-black px-5 py-2.5 rounded-2xl uppercase tracking-widest border-2 ${
                                            report.status === 'Pending' 
                                                ? 'bg-red-50 text-red-500 border-red-100'
                                                : 'bg-green-50 text-green-600 border-green-100'
                                        }`}>
                                            {report.status}
                                        </span>
                                        <button 
                                            onClick={() => handleDelete(report._id)} 
                                            className="text-slate-200 hover:text-red-500 transition-colors p-1" 
                                            title="Remove Record"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Geo-Tagged Address</p>
                                        <p className="text-xs text-slate-600 font-bold leading-relaxed line-clamp-2 italic">{report.address || "Fetching exact coordinates..."}</p>
                                    </div>

                                    {report.status === 'Resolved' && (
                                        <div className="mt-auto pt-8 border-t border-slate-50 flex justify-between items-center">
                                            <p className="text-[10px] text-green-600 font-black uppercase tracking-widest italic">Restoration Verified</p>
                                            <span className="text-[9px] font-mono text-slate-300">#{report._id.slice(-6).toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;