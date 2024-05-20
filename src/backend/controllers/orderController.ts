import { Request, Response } from 'express';
import prisma from '../prisma';
import { GetOrdersParams, CountOrdersParams } from '@/shared/orderTypes';

export const createOrder = async (req: Request, res: Response) => {
  const data = { data: req.body };
  try {
    const order = await prisma.orders.create(data);
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while creating the order' });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  const params = req.params as GetOrdersParams;
  try {
    const orders = await prisma.orders.findMany(params);
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching orders' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const order = await prisma.orders.findUnique({ where: { id } });
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the order' });
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = {
    where: { id },
    data: req.body
  };
  try {
    const order = await prisma.orders.update(data);
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while updating the order' });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.orders.delete({ where: { id } });
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while deleting the order' });
  }
};

export const countOrders = async (req: Request, res: Response) => {
  const params = req.params as CountOrdersParams;
  try {
    const count = await prisma.orders.count(params);
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while counting orders' });
  }
};
