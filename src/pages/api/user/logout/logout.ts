import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const cookie = serialize('sessionId', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
    sameSite: 'strict' as 'strict' | 'lax' | 'none',
    secure: process.env.NODE_ENV === 'production'
  });

  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ message: 'Logged out successfully.' });
}

