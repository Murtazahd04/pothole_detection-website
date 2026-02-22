import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

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