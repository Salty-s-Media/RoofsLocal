import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const getDownloads = async () => {
  try {
    const response = await axios.get(`${API_URL}/downloads`);
    return response.data;
  } catch (error) {
    console.error('Error fetching downloads:', error);
    throw error;
  }
};

export const getDownloadById = async (id: string) => {
  try {
    const response = await axios.get(`${API_URL}/downloads/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching download with id ${id}:`, error);
    throw error;
  }
};
