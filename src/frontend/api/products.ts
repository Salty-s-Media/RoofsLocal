import axios from 'axios';
import { CreateProductInput, GetProductsParams, UpdateProductInput, CountProductsParams } from '@/shared/productTypes';

const API_URL = process.env.SERVER_API_URL;

export const createProduct = async (data: CreateProductInput) => {
  try {
    const response = await axios.post(`${API_URL}/products`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const getProducts = async (params: GetProductsParams) => {
  try {
    const queryParams: any = {};
    if (params.select) queryParams.select = JSON.stringify(params.select);
    if (params.where) queryParams.where = JSON.stringify(params.where);
    if (params.orderBy) queryParams.orderBy = JSON.stringify(params.orderBy);
    if (params.take !== undefined) queryParams.take = params.take;

    const response = await axios.get(`${API_URL}/products`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, data: UpdateProductInput) => {
  try {
    const response = await axios.put(`${API_URL}/products/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating product with id ${id}:`, error);
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/products/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting product with id ${id}:`, error);
    throw error;
  }
};

export const getProductById = async (id: string) => {
  try {
    const response = await axios.get(`${API_URL}/products/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching product with id ${id}:`, error);
    throw error;
  }
};

export const countProducts = async (params: CountProductsParams) => {
  try {
    const queryParams: any = {};
    if (params.where) queryParams.where = JSON.stringify(params.where);

    const response = await axios.get(`${API_URL}/products/count`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('Error counting products:', error);
    throw error;
  }
};

