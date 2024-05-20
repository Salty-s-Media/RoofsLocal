import { Order } from './orderTypes';
import { Download } from './downloadTypes';

export type Product = {
  id: string,
  name: string,
  priceInCents: number,
  filePath: string,
  imagePath: string,
  description: string,
  isAvailableForPurchase: boolean,
  createdAt: Date,
  updatedAt: Date,
  orders: Order[],
  downloads: Download[]
};

export interface CreateProductInput {
  isAvailableForPurchase: boolean,
  name: string,
  description: string,
  priceInCents: number,
  filePath: string,
  imagePath: string
};

export interface GetProductsParams {
  select?: {},
  where?: {},
  orderBy?: {},
  take?: number
};

export interface UpdateProductInput {
  isAvailableForPurchase?: boolean,
  name?: string,
  description?: string,
  priceInCents?: number,
  filePath?: string,
  imagePath?: string
};

export interface CountProductsParams {
  where?: {}
};
