import axios from 'axios';
import { CreateDownloadInput, GetDownloadsParams, UpdateDownloadInput, CountDownloadsParams } from '@/shared/downloadTypes';

const API_URL = process.env.SERVER_API_URL;

export const createDownload = async (data: CreateDownloadInput) => {
  try {
    const response = await axios.post(`${API_URL}/downloads`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating download:', error);
    throw error;
  }
};

export const getDownloads = async (params: GetDownloadsParams) => {
  try {
    const queryParams: any = {};
    if (params.select) queryParams.select = JSON.stringify(params.select);
    if (params.where) queryParams.where = JSON.stringify(params.where);
    if (params.orderBy) queryParams.orderBy = JSON.stringify(params.orderBy);
    if (params.take !== undefined) queryParams.take = params.take;

    const response = await axios.get(`${API_URL}/downloads`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('Error fetching downloads:', error);
    throw error;
  }
};

export const updateDownload = async (id: string, data: UpdateDownloadInput) => {
  try {
    const response = await axios.put(`${API_URL}/downloads/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating download with id ${id}:`, error);
    throw error;
  }
};

export const deleteDownload = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/downloads/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting download with id ${id}:`, error);
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

export const countDownloads = async (params: CountDownloadsParams) => {
  try {
    const queryParams: any = {};
    if (params.where) queryParams.where = JSON.stringify(params.where);

    const response = await axios.get(`${API_URL}/downloads/count`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('Error counting downloads:', error);
    throw error;
  }
};

