import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client/extension';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, token } = req.query;

  if (!email || !token) {
    return res.status(400).json({ message: 'Email and token are required' });
  }

  const decodedEmail = decodeURIComponent(email as string);
  const decodedToken = decodeURIComponent(token as string);

  try {
    const userToken = await prisma.contractor.findUnique({
      where: { email: decodedEmail },
    });

    if (!userToken) {
      return res.status(404).json({ message: 'Token not found' });
    }

    const isValidToken = await bcrypt.compare(decodedToken, userToken.resetToken);

    if (!isValidToken) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.contractor.update({
      where: { email: decodedEmail },
      data: {
        password: hashedPassword,
        resetToken: null
      },
    });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}