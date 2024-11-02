import { Resend } from "resend";
import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = await bcrypt.hash(resetToken, 10);

    const forgotPasswordUrl = `${
      process.env.NEXT_PUBLIC_SERVER_URL
    }/api/user/password/change?email=${encodeURIComponent(
      email
    )}&token=${encodeURIComponent(hashedResetToken)}`;

    await resend.emails.send({
      to: email,
      from: 'Roofs Local <info@roofslocal.app>',
      subject: 'Password Reset',
      text: `You requested a password reset. Click the link to reset your password: ${forgotPasswordUrl}`,
    });

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}