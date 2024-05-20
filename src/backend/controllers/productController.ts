import { Request, Response } from 'express';
import prisma from '../prisma';
import { GetProductsParams, CountProductsParams } from '@/shared/productTypes';

export const createProduct = async (req: Request, res: Response) => {
  const data = { data: req.body };
  try {
    const product = await prisma.products.create(data);
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while creating the product' });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  const params = req.params as GetProductsParams;
  try {
    const products = await prisma.products.findMany(params);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const product = await prisma.products.findUnique({ where: { id } });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = {
    where: { id },
    data: req.body
  };
  try {
    const product = await prisma.products.update(data);
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while updating the product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.products.delete({ where: { id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while deleting the product' });
  }
};

export const countProducts = async (req: Request, res: Response) => {
  const params = req.params as CountProductsParams;
  try {
    const count = await prisma.products.count(params);
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while counting products' });
  }
};
