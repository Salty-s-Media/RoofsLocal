import { Product } from "./productTypes";

export type Download = {
  id: string,
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date,
  product: Product
};

export interface CreateDownloadInput {
  expiresAt: Date,
  productId: string
};

export interface GetDownloadsParams {
  select?: {},
  where?: {},
  orderBy?: {},
  take?: number
};

export interface UpdateDownloadInput {
  expiresAt?: Date
};

export interface CountDownloadsParams { 
  where?: {}
};
