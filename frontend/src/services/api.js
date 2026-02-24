import axios from 'axios';

export const  api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export const uploadPothole = async (formData) => {
    try {
        const response = await axios.post(`${API_URL}/predict`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};