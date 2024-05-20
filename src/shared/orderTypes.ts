import { User } from './userTypes';
import { Product } from './productTypes';

export type Order = {
  id: string,
  pricePaidInCents: number,
  createdAt: Date,
  updatedAt: Date,
  users: User,
  products: Product
};

export interface CreateOrderInput {
  pricePaidInCents: number,
  userId: string,
  productIdL: string
};

export interface GetOrdersParams {
  select?: {},
  where?: {},
  orderBy?: {},
  take?: number
};

export interface UpdateOrderInput {
  pricePaidInCents?: number,
};

export interface CountOrdersParams { 
  where?: {}
};
