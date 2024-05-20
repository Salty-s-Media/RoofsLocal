import { Request, Response } from 'express';
import prisma from '../prisma';
import { GetUsersParams, CountUsersParams } from '@/shared/userTypes';

export const createUser = async (req: Request, res: Response) => {
  const data = { data: req.body };
  try {
    const user = await prisma.users.create(data);
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while creating the user' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  const params = req.params as GetUsersParams;
  try {
    const users = await prisma.users.findMany(params);
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.users.findUnique({ where: { id } });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = {
    where: { id },
    data: req.body
  };
  try {
    const user = await prisma.users.update(data);
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while updating the user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.users.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while deleting the user' });
  }
};

export const countUsers = async (req: Request, res: Response) => {
  const params = req.params as CountUsersParams;
  try {
    const count = await prisma.users.count(params);
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while counting users' });
  }
};
