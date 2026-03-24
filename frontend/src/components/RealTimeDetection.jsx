import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import axios from 'axios';

const RealTimeDetection = () => {
    const webcamRef = useRef(null);
    const navigate = useNavigate();
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionResult, setDetectionResult] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [potholeCount, setPotholeCount] = useState(0);
    const [municipality, setMunicipality] = useState(null);
    const [autoCapture, setAutoCapture] = useState(true);
    const [detectionInterval, setDetectionInterval] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [detectionHistory, setDetectionHistory] = useState([]);
    const [facingMode, setFacingMode] = useState("environment");
    const [isMobile, setIsMobile] = useState(false);
    
    const CONFIDENCE_THRESHOLD = 0.75; // 75% confidence threshold
    // Use environment variable for backend URL (for production)
    const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const userId = localStorage.getItem('user_id');
    const userName = localStorage.getItem('name') || "Citizen";

    // Check if device is mobile
    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent.toLowerCase());
            setIsMobile(isMobileDevice);
        };
        checkMobile();
        
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Get current location on component mount
    useEffect(() => {
        getCurrentLocation();
        
        return () => {
            if (detectionInterval) {
                clearInterval(detectionInterval);
            }
        };
    }, []);

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ lat: latitude, lng: longitude });
                    
                    try {
                        const res = await axios.get(`${BACKEND_URL}/get-municipality`, {
                            params: { lat: latitude, lng: longitude },
                            timeout: 10000
                        });
                        setAddress(res.data.address);
                        setMunicipality({
                            code: res.data.municipality,
                            name: res.data.municipality_name
                        });
                    } catch (err) {
                        console.error("Error getting location info:", err);
                        setAddress(`Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                        setMunicipality({
                            code: "OTHER",
                            name: "Unknown Area"
                        });
                    }
                },
                (error) => {
                    console.error("Error getting location:", error);
                    let errorMessage = "Please enable location services";
                    if (error.code === 1) errorMessage = "Location permission denied";
                    else if (error.code === 2) errorMessage = "Location unavailable";
                    else if (error.code === 3) errorMessage = "Location request timeout";
                    alert(errorMessage);
                }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    // Filter boxes by confidence threshold
    const filterBoxesByConfidence = (boxes) => {
        if (!boxes || boxes.length === 0) return [];
        return boxes.filter(box => box.confidence >= CONFIDENCE_THRESHOLD);
    };

    // Switch camera between front and back
    const switchCamera = () => {
        setFacingMode(prev => prev === "environment" ? "user" : "environment");
        if (detectionInterval) {
            clearInterval(detectionInterval);
            setDetectionInterval(null);
            setIsDetecting(false);
        }
        setDetectionResult(null);
        setPotholeCount(0);
    };

    // Capture and detect frame
    const captureAndDetect = async () => {
        if (!webcamRef.current || isProcessing) return;
        
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;
        
        setIsProcessing(true);
        
        try {
            const res = await axios.post(`${BACKEND_URL}/detect-realtime`, {
                image: imageSrc
            }, {
                timeout: 15000
            });
            
            if (res.data.success) {
                // Filter boxes by confidence threshold
                const filteredBoxes = filterBoxesByConfidence(res.data.boxes);
                const filteredCount = filteredBoxes.length;
                
                setPotholeCount(filteredCount);
                setDetectionResult({
                    ...res.data,
                    boxes: filteredBoxes,
                    pothole_count: filteredCount
                });
                
                // Auto-capture only if potholes detected with high confidence
                if (autoCapture && filteredCount > 0 && !showPreview) {
                    handleAutoCapture(imageSrc, filteredCount);
                }
                
                // Add to detection history
                setDetectionHistory(prev => [
                    {
                        timestamp: new Date(),
                        potholeCount: filteredCount,
                        boxes: filteredBoxes,
                        rawCount: res.data.pothole_count
                    },
                    ...prev.slice(0, 9)
                ]);
            }
        } catch (err) {
            console.error("Detection error:", err);
            if (err.code === 'ECONNABORTED') {
                console.log("Detection request timeout");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // Auto capture when pothole detected with high confidence
    const handleAutoCapture = async (imageSrc, count) => {
        setCapturedImage(imageSrc);
        setShowPreview(true);
        
        if (detectionInterval) {
            clearInterval(detectionInterval);
            setDetectionInterval(null);
            setIsDetecting(false);
        }
    };

    // Submit report to backend
    const submitReport = async () => {
        if (!capturedImage || !location) {
            alert("Missing image or location data");
            return;
        }
        
        setIsProcessing(true);
        
        try {
            const res = await axios.post(`${BACKEND_URL}/auto-report`, {
                image: capturedImage,
                latitude: location.lat,
                longitude: location.lng,
                user_id: userId,
                user_name: userName,
                pothole_count: potholeCount
            }, {
                timeout: 20000
            });
            
            if (res.data.success) {
                alert(`✅ Report submitted successfully!\n\nPotholes Detected: ${res.data.pothole_count}\nMunicipality: ${res.data.municipality_name}\nConfidence: >${CONFIDENCE_THRESHOLD * 100}%\n\nThank you for helping fix our roads!`);
                
                setShowPreview(false);
                setCapturedImage(null);
                setPotholeCount(0);
                setDetectionResult(null);
                
                if (autoCapture) {
                    startAutoDetection();
                }
            }
        } catch (err) {
            console.error("Submission error:", err);
            alert("Failed to submit report. Please check your internet connection and try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Cancel and discard captured image
    const cancelCapture = () => {
        setShowPreview(false);
        setCapturedImage(null);
        setPotholeCount(0);
        setDetectionResult(null);
        
        if (autoCapture) {
            startAutoDetection();
        }
    };

    // Start auto detection interval
    const startAutoDetection = () => {
        if (detectionInterval) clearInterval(detectionInterval);
        const interval = setInterval(() => {
            captureAndDetect();
        }, 1000);
        setDetectionInterval(interval);
        setIsDetecting(true);
    };

    // Stop auto detection
    const stopAutoDetection = () => {
        if (detectionInterval) {
            clearInterval(detectionInterval);
            setDetectionInterval(null);
        }
        setIsDetecting(false);
    };

    // Toggle auto detection
    const toggleDetection = () => {
        if (isDetecting) {
            stopAutoDetection();
        } else {
            startAutoDetection();
        }
    };

    // Toggle auto capture mode
    const toggleAutoCapture = () => {
        setAutoCapture(prev => !prev);
        if (!autoCapture && !showPreview && !isDetecting) {
            startAutoDetection();
        }
    };

    // Manual capture
    const manualCapture = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                if (detectionInterval) {
                    clearInterval(detectionInterval);
                    setDetectionInterval(null);
                    setIsDetecting(false);
                }
                handleAutoCapture(imageSrc, potholeCount);
            }
        }
    };

    // Retake photo
    const retakePhoto = () => {
        setShowPreview(false);
        setCapturedImage(null);
        setPotholeCount(0);
        setDetectionResult(null);
        
        if (autoCapture) {
            startAutoDetection();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <div className="p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-6 md:mb-8 text-center">
                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter italic uppercase mb-2 md:mb-4">
                            Real-Time Pothole Detection
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 max-w-2xl mx-auto px-4">
                            Point your camera at the road. The AI will automatically detect potholes with {'>'}75% confidence.
                            Reports will be sent to the correct municipality (BMC/TMC/NMMC) based on your location.
                        </p>
                        <div className="mt-2 inline-block bg-yellow-100 text-yellow-800 text-[10px] md:text-xs px-3 py-1 rounded-full font-bold">
                            🎯 Confidence Threshold: {CONFIDENCE_THRESHOLD * 100}%
                        </div>
                    </div>

                    {/* Location Info Bar */}
                    {location && (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 md:p-4 mb-4 md:mb-6 flex flex-wrap justify-between items-center gap-3 md:gap-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-xl md:text-2xl">📍</span>
                                <div>
                                    <p className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-widest">Your Location</p>
                                    <p className="text-xs md:text-sm text-slate-700 font-medium truncate max-w-[150px] md:max-w-none">{address || "Fetching address..."}</p>
                                </div>
                            </div>
                            {municipality && (
                                <div className="flex items-center gap-2 md:gap-3">
                                    <span className="text-xl md:text-2xl">🏛️</span>
                                    <div>
                                        <p className="text-[10px] md:text-xs font-black text-green-600 uppercase tracking-widest">Municipality</p>
                                        <p className="text-xs md:text-sm font-bold text-green-700">{municipality.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                        {/* Camera Section */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
                                <div className="relative bg-slate-900 rounded-t-[1.5rem] md:rounded-t-[2rem]">
                                    {!showPreview ? (
                                        <>
                                            <Webcam
                                                ref={webcamRef}
                                                screenshotFormat="image/jpeg"
                                                videoConstraints={{
                                                    facingMode: facingMode,
                                                    aspectRatio: 16 / 9
                                                }}
                                                className="w-full h-auto rounded-t-[1.5rem] md:rounded-t-[2rem]"
                                                mirrored={facingMode === "user"}
                                                style={{
                                                    transform: facingMode === "user" ? 'scaleX(-1)' : 'none',
                                                    WebkitTransform: facingMode === "user" ? 'scaleX(-1)' : 'none'
                                                }}
                                            />
                                            {/* Detection Overlay */}
                                            {detectionResult && detectionResult.boxes && detectionResult.boxes.length > 0 && webcamRef.current?.video && (
                                                <div className="absolute inset-0 pointer-events-none">
                                                    {detectionResult.boxes.map((box, idx) => {
                                                        const videoWidth = webcamRef.current.video.videoWidth;
                                                        const videoHeight = webcamRef.current.video.videoHeight;
                                                        let x1 = box.x1, x2 = box.x2;
                                                        
                                                        if (facingMode === "user") {
                                                            x1 = videoWidth - box.x2;
                                                            x2 = videoWidth - box.x1;
                                                        }
                                                        
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="absolute border-2 border-red-500 bg-red-500/20"
                                                                style={{
                                                                    left: `${(x1 / videoWidth) * 100}%`,
                                                                    top: `${(box.y1 / videoHeight) * 100}%`,
                                                                    width: `${((x2 - x1) / videoWidth) * 100}%`,
                                                                    height: `${((box.y2 - box.y1) / videoHeight) * 100}%`
                                                                }}
                                                            >
                                                                <span className="absolute -top-6 left-0 bg-red-500 text-white text-[8px] px-2 py-0.5 rounded">
                                                                    {Math.round(box.confidence * 100)}% Confident
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            
                                            {/* Status Badge */}
                                            <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/70 backdrop-blur-md rounded-full px-2 py-1 md:px-4 md:py-2">
                                                <span className="text-[8px] md:text-xs text-white font-black uppercase tracking-wider">
                                                    {isProcessing ? "🔍 Analyzing..." : isDetecting ? "🎥 Live Detection" : "⏸️ Paused"}
                                                </span>
                                            </div>
                                            
                                            {/* Pothole Count Badge */}
                                            {potholeCount > 0 && (
                                                <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-red-500 rounded-full px-2 py-1 md:px-4 md:py-2 animate-pulse">
                                                    <span className="text-[8px] md:text-xs text-white font-black">
                                                        🚧 {potholeCount} High-Confidence Pothole{potholeCount !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {/* Camera Switch Button */}
                                            {isMobile && (
                                                <button
                                                    onClick={switchCamera}
                                                    className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-white/90 backdrop-blur-md rounded-full p-2 md:p-3 shadow-lg hover:bg-white transition-all z-10"
                                                    title="Switch Camera"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16M8 4v16M16 4v16" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="relative">
                                            <img src={capturedImage} alt="Captured" className="w-full h-auto rounded-t-[1.5rem] md:rounded-t-[2rem]" />
                                            <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-red-500 rounded-full px-2 py-1 md:px-4 md:py-2">
                                                <span className="text-[8px] md:text-xs text-white font-black">
                                                    🚧 {potholeCount} High-Confidence Pothole{potholeCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="p-4 md:p-6 flex flex-wrap gap-2 md:gap-4 justify-center">
                                    {!showPreview ? (
                                        <>
                                            <button
                                                onClick={toggleDetection}
                                                className={`px-4 md:px-8 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all ${
                                                    isDetecting
                                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                                }`}
                                            >
                                                {isDetecting ? "⏸️ Pause" : "▶️ Start"}
                                            </button>
                                            <button
                                                onClick={manualCapture}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-8 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all"
                                                disabled={isProcessing}
                                            >
                                                📸 Capture
                                            </button>
                                            <button
                                                onClick={toggleAutoCapture}
                                                className={`px-4 md:px-8 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all ${
                                                    autoCapture
                                                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                                        : 'bg-gray-500 hover:bg-gray-600 text-white'
                                                }`}
                                            >
                                                {autoCapture ? "🤖 Auto ON" : "⚡ Auto OFF"}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={submitReport}
                                                disabled={isProcessing}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 md:px-8 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all"
                                            >
                                                {isProcessing ? "Submitting..." : "✅ Submit"}
                                            </button>
                                            <button
                                                onClick={retakePhoto}
                                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 md:px-8 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all"
                                            >
                                                🔄 Retake
                                            </button>
                                            <button
                                                onClick={cancelCapture}
                                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 md:px-8 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all"
                                            >
                                                ✖️ Cancel
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info Panel */}
                        <div className="space-y-4 md:space-y-6">
                            {/* Detection Status */}
                            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-slate-100">
                                <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest mb-3 md:mb-4">
                                    📊 Detection Status
                                </h3>
                                <div className="space-y-2 md:space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] md:text-xs text-slate-500">Status:</span>
                                        <span className={`text-[10px] md:text-xs font-bold ${isDetecting ? 'text-green-600' : 'text-red-500'}`}>
                                            {isDetecting ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] md:text-xs text-slate-500">Auto Capture:</span>
                                        <span className={`text-[10px] md:text-xs font-bold ${autoCapture ? 'text-purple-600' : 'text-red-500'}`}>
                                            {autoCapture ? "ON" : "OFF"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] md:text-xs text-slate-500">High-Confidence Potholes:</span>
                                        <span className="text-[10px] md:text-xs font-bold text-red-600">{potholeCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] md:text-xs text-slate-500">Confidence Threshold:</span>
                                        <span className="text-[10px] md:text-xs font-bold text-yellow-600">{CONFIDENCE_THRESHOLD * 100}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] md:text-xs text-slate-500">Municipality:</span>
                                        <span className="text-[10px] md:text-xs font-bold text-blue-600 truncate max-w-[120px] md:max-w-none">{municipality?.name || "Detecting..."}</span>
                                    </div>
                                    {isMobile && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] md:text-xs text-slate-500">Camera:</span>
                                            <span className="text-[10px] md:text-xs font-bold text-blue-600">
                                                {facingMode === "environment" ? "📷 Back" : "🤳 Front"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Detection History */}
                            {detectionHistory.length > 0 && (
                                <div className="hidden sm:block bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-slate-100">
                                    <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest mb-3 md:mb-4">
                                        📜 Recent Detections
                                    </h3>
                                    <div className="space-y-2 max-h-32 md:max-h-48 overflow-y-auto">
                                        {detectionHistory.map((detection, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-1 md:py-2 border-b border-slate-100">
                                                <span className="text-[10px] md:text-xs text-slate-600">
                                                    {detection.timestamp.toLocaleTimeString()}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {detection.rawCount > detection.potholeCount && (
                                                        <span className="text-[8px] md:text-[9px] text-gray-400">
                                                            (Low conf: {detection.rawCount - detection.potholeCount})
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] md:text-xs font-bold ${
                                                        detection.potholeCount > 0 ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                        {detection.potholeCount} pothole{detection.potholeCount !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Instructions */}
                            <div className="bg-blue-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-blue-100">
                                <h3 className="text-xs md:text-sm font-black text-blue-900 uppercase tracking-widest mb-2 md:mb-3">
                                    💡 How It Works
                                </h3>
                                <ul className="space-y-1 md:space-y-2 text-[10px] md:text-xs text-blue-800">
                                    <li className="flex items-start gap-1 md:gap-2">
                                        <span>•</span>
                                        <span>Point camera at the road</span>
                                    </li>
                                    <li className="flex items-start gap-1 md:gap-2">
                                        <span>•</span>
                                        <span>AI detects potholes with {CONFIDENCE_THRESHOLD * 100}%+ confidence</span>
                                    </li>
                                    <li className="flex items-start gap-1 md:gap-2">
                                        <span>•</span>
                                        <span>Only high-confidence detections trigger capture</span>
                                    </li>
                                    <li className="flex items-start gap-1 md:gap-2">
                                        <span>•</span>
                                        <span>Auto-captures when potholes are confidently detected</span>
                                    </li>
                                    <li className="flex items-start gap-1 md:gap-2">
                                        <span>•</span>
                                        <span>Location automatically detected</span>
                                    </li>
                                    <li className="flex items-start gap-1 md:gap-2">
                                        <span>•</span>
                                        <span>Reports sent to correct municipality</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealTimeDetection;