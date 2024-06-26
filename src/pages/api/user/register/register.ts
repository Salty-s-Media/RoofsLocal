import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { serialize } from 'cookie';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  console.log("Request Body: ", req.body);
  const {
    firstName,
    lastName,
    company,
    email,
    phone,
    zipCodes,
    stripeId,
    password,
  } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  const sessionId = crypto.randomBytes(16).toString("hex");
  const hashedSessionId = await bcrypt.hash(sessionId, 10);
  const expires = new Date(Date.now() + 10 * 24 * 3600 * 1000);

  try {
    const contractor = await prisma.contractor.create({
      data: {
        firstName,
        lastName,
        company,
        email,
        phone,
        zipCodes,
        stripeId,
        password: hashedPassword,
        sessionId: hashedSessionId,
        sessionExpiry: expires,
      },
    });

    const cookieOptions = {
      httpOnly: true,
      expires,
      path: '/',
      sameSite: 'strict' as 'strict' | 'lax' | 'none',
      secure: process.env.NODE_ENV === 'production'
    };
    const cookie = serialize('sessionId', sessionId, cookieOptions);
    res.setHeader('Set-Cookie', cookie);

    res.status(201).json(contractor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Failed to register contractor: ${error}` });
  }
}
