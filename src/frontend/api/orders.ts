import axios from 'axios';
import { CreateOrderInput, GetOrdersParams, UpdateOrderInput, CountOrdersParams } from '@/shared/orderTypes';

const API_URL = process.env.SERVER_API_URL;

export const createOrder = async (data: CreateOrderInput) => {
  try {
    const response = await axios.post(`${API_URL}/orders`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const getOrders = async (params: GetOrdersParams) => {
  try {
    const queryParams: any = {};
    if (params.select) queryParams.select = JSON.stringify(params.select);
    if (params.where) queryParams.where = JSON.stringify(params.where);
    if (params.orderBy) queryParams.orderBy = JSON.stringify(params.orderBy);
    if (params.take !== undefined) queryParams.take = params.take;

    const response = await axios.get(`${API_URL}/orders`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const updateOrder = async (id: string, data: UpdateOrderInput) => {
  try {
    const response = await axios.put(`${API_URL}/orders/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating order with id ${id}:`, error);
    throw error;
  }
};

export const deleteOrder = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/orders/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting order with id ${id}:`, error);
    throw error;
  }
};

export const getOrderById = async (id: string) => {
  try {
    const response = await axios.get(`${API_URL}/orders/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching order with id ${id}:`, error);
    throw error;
  }
};

export const countOrders = async (params: CountOrdersParams) => {
  try {
    const queryParams: any = {};
    if (params.where) queryParams.where = JSON.stringify(params.where);

    const response = await axios.get(`${API_URL}/orders/count`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('Error counting orders:', error);
    throw error;
  }
};

