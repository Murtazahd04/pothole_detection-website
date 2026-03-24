import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
/**
 * Detection Service - Handles all real-time detection and reporting API calls
 */
const detectionService = {
    /**
     * Real-time detection from camera frame
     * @param {string} imageBase64 - Base64 encoded image from webcam
     * @returns {Promise} Detection results with pothole count and bounding boxes
     */
    detectRealtime: async (imageBase64) => {
        try {
            const response = await axios.post(`${BACKEND_URL}/detect-realtime`, {
                image: imageBase64
            });
            return response.data;
        } catch (error) {
            console.error("Detection error:", error);
            throw error.response?.data || { error: "Detection failed" };
        }
    },

    /**
     * Auto-report with captured image and location
     * @param {Object} reportData - Report data object
     * @param {string} reportData.image - Base64 encoded image
     * @param {number} reportData.latitude - GPS latitude
     * @param {number} reportData.longitude - GPS longitude
     * @param {string} reportData.user_id - User ID from localStorage
     * @param {string} reportData.user_name - User name from localStorage
     * @param {number} reportData.pothole_count - Number of potholes detected
     * @returns {Promise} Submission result
     */
    autoReport: async (reportData) => {
        try {
            const response = await axios.post(`${BACKEND_URL}/auto-report`, {
                image: reportData.image,
                latitude: reportData.latitude,
                longitude: reportData.longitude,
                user_id: reportData.user_id,
                user_name: reportData.user_name,
                pothole_count: reportData.pothole_count
            });
            return response.data;
        } catch (error) {
            console.error("Auto-report error:", error);
            throw error.response?.data || { error: "Submission failed" };
        }
    },

    /**
     * Get municipality info from coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise} Municipality information
     */
    getMunicipality: async (lat, lng) => {
        try {
            const response = await axios.get(`${BACKEND_URL}/get-municipality`, {
                params: { lat, lng }
            });
            return response.data;
        } catch (error) {
            console.error("Get municipality error:", error);
            throw error.response?.data || { error: "Failed to get municipality" };
        }
    },

    /**
     * Regular report submission (with file upload)
     * @param {FormData} formData - Form data with image and report details
     * @returns {Promise} Submission result
     */
    submitReport: async (formData) => {
        try {
            const response = await axios.post(`${BACKEND_URL}/report`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error("Report submission error:", error);
            throw error.response?.data || { error: "Report submission failed" };
        }
    },

    /**
     * Get user's reports history
     * @param {string} userId - User ID
     * @returns {Promise} List of user's reports
     */
    getUserReports: async (userId) => {
        try {
            const response = await axios.get(`${BACKEND_URL}/reports`, {
                params: { user_id: userId }
            });
            return response.data;
        } catch (error) {
            console.error("Fetch reports error:", error);
            throw error.response?.data || { error: "Failed to fetch reports" };
        }
    },

    /**
     * Delete a report
     * @param {string} reportId - Report ID to delete
     * @returns {Promise} Deletion result
     */
    deleteReport: async (reportId) => {
        try {
            const response = await axios.delete(`${BACKEND_URL}/reports/${reportId}`);
            return response.data;
        } catch (error) {
            console.error("Delete report error:", error);
            throw error.response?.data || { error: "Failed to delete report" };
        }
    },

    /**
     * Get location address from coordinates (reverse geocoding)
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise} Address information
     */
    getAddressFromCoordinates: async (lat, lng) => {
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
                params: {
                    format: 'json',
                    lat: lat,
                    lon: lng,
                    'accept-language': 'en'
                }
            });
            return response.data;
        } catch (error) {
            console.error("Reverse geocoding error:", error);
            throw { error: "Failed to get address" };
        }
    },

    /**
     * Search for locations (forward geocoding)
     * @param {string} query - Location search query
     * @returns {Promise} List of location suggestions
     */
    searchLocation: async (query) => {
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: query,
                    format: 'json',
                    limit: 5,
                    'accept-language': 'en'
                }
            });
            return response.data;
        } catch (error) {
            console.error("Location search error:", error);
            throw { error: "Failed to search location" };
        }
    },

    /**
     * Get current user's location using browser geolocation
     * @returns {Promise} Current location coordinates
     */
    getCurrentLocation: () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject({ error: "Geolocation is not supported by your browser" });
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    let errorMessage = "Failed to get location";
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = "Location permission denied";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "Location information unavailable";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "Location request timed out";
                            break;
                        default:
                            errorMessage = error.message;
                    }
                    reject({ error: errorMessage });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    },

    /**
     * Watch user's location continuously
     * @param {Function} onSuccess - Callback on location update
     * @param {Function} onError - Callback on error
     * @returns {number} Watch ID for clearing
     */
    watchLocation: (onSuccess, onError) => {
        if (!navigator.geolocation) {
            onError({ error: "Geolocation is not supported" });
            return null;
        }
        
        return navigator.geolocation.watchPosition(
            (position) => {
                onSuccess({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                let errorMessage = "Location watch failed";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location permission denied";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information unavailable";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out";
                        break;
                    default:
                        errorMessage = error.message;
                }
                onError({ error: errorMessage });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    },

    /**
     * Clear location watch
     * @param {number} watchId - Watch ID from watchLocation
     */
    clearLocationWatch: (watchId) => {
        if (watchId && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchId);
        }
    },

    /**
     * Process image for detection (convert to base64)
     * @param {File} file - Image file
     * @returns {Promise} Base64 encoded image
     */
    processImageToBase64: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    },

    /**
     * Compress image before sending to server
     * @param {string} base64Image - Base64 encoded image
     * @param {number} maxWidth - Maximum width
     * @param {number} quality - Image quality (0-1)
     * @returns {Promise} Compressed base64 image
     */
    compressImage: (base64Image, maxWidth = 1024, quality = 0.8) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = base64Image;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = reject;
        });
    },

    /**
     * Check if there are enough frames for stable detection
     * @param {Array} detectionHistory - Array of detection results
     * @param {number} threshold - Minimum frames required
     * @returns {boolean} Whether detection is stable
     */
    isDetectionStable: (detectionHistory, threshold = 3) => {
        if (detectionHistory.length < threshold) return false;
        
        const recentDetections = detectionHistory.slice(0, threshold);
        const hasPothole = recentDetections.some(d => d.potholeCount > 0);
        
        return hasPothole;
    },

    /**
     * Calculate detection confidence based on history
     * @param {Array} detectionHistory - Array of detection results
     * @returns {number} Confidence percentage (0-100)
     */
    getDetectionConfidence: (detectionHistory) => {
        if (detectionHistory.length === 0) return 0;
        
        const recentDetections = detectionHistory.slice(0, 5);
        const positiveDetections = recentDetections.filter(d => d.potholeCount > 0).length;
        
        return Math.round((positiveDetections / recentDetections.length) * 100);
    }
};

export default detectionService;