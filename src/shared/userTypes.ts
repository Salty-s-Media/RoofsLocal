import { Order } from './orderTypes';

export type User = {
  id: string,
  email: string,
  createdAt: Date,
  updatedAt: Date,
  orders: Order[]
};

export interface CreateUserInput {
  email: string
};

export interface GetUsersParams {
  select?: {},
  where?: {},
  orderBy?: {},
  take?: number
};

export interface UpdateUserInput {
  email?: string
};

export interface CountUsersParams {
  where?: {}
};
