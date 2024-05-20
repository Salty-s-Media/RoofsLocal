import { Request, Response } from 'express';
import prisma from '../prisma';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.orders.findMany();
    res.json(orders);
  } catch (error) {
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
    res.status(500).json({ error: 'An error occurred while fetching the order' });
  }
};
