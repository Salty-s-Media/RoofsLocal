import axios from 'axios';
import { CreateUserInput, GetUsersParams, UpdateUserInput, CountUsersParams } from '@/shared/userTypes';

const API_URL = process.env.SERVER_API_URL;

export const createUser = async (data: CreateUserInput) => {
  try {
    const response = await axios.post(`${API_URL}/users`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUsers = async (params: GetUsersParams) => {
  try {
    const queryParams: any = {};
    if (params.select) queryParams.select = JSON.stringify(params.select);
    if (params.where) queryParams.where = JSON.stringify(params.where);
    if (params.orderBy) queryParams.orderBy = JSON.stringify(params.orderBy);
    if (params.take !== undefined) queryParams.take = params.take;

    const response = await axios.get(`${API_URL}/users`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const updateUser = async (id: string, data: UpdateUserInput) => {
  try {
    const response = await axios.put(`${API_URL}/users/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating user with id ${id}:`, error);
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/users/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting user with id ${id}:`, error);
    throw error;
  }
};

export const getUserById = async (id: string) => {
  try {
    const response = await axios.get(`${API_URL}/users/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user with id ${id}:`, error);
    throw error;
  }
};

export const countUsers = async (params: CountUsersParams) => {
  try {
    const queryParams: any = {};
    if (params.where) queryParams.where = JSON.stringify(params.where);

    const response = await axios.get(`${API_URL}/users/count`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('Error counting users:', error);
    throw error;
  }
};
