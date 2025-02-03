import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { parse } from 'cookie';

interface Contractor {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  zipCodes: string[];
  boughtZipCodes: string[];
  stripeId: string; // stripe customer id
  password: string;
  sessionId: string;
  stripeSessionId?: string; // stripe checkout session id
  pricePerLead: number;
  sessionExpiry: Date;
  verificationToken: string;
  resetToken?: string;
  isVerified: boolean;
  phoneVerified: boolean;
  hubspotKey?: string;
  ghlKey?: string;
  ghlLocationId?: string;
  ghlContactId?: string;
  ghlPipelineId: string;
  ghlPipelineStageId: string;
  createdAt: Date;
  updatedAt: Date;
}

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const cookies = parse(req.headers.cookie || '');

    const sessionId = cookies.sessionId;

    if (!sessionId) {
      console.log('Session ID is null!');
      return res.status(401).json({ error: 'You are not logged in.' });
    }

    const contractors = await prisma.contractor.findMany();
    let currentUser: Partial<Contractor> = {};

    const expiredSessions = contractors.filter(
      (contractor) =>
        contractor.sessionExpiry &&
        new Date(contractor.sessionExpiry) < new Date()
    );

    console.log(`Found ${expiredSessions.length} expired sessions`);

    const matches = await Promise.all(
      expiredSessions.map(async (contractor) => {
        console.log(
          `Checking session for contractor ID: ${contractor.id}, Session Expiry: ${contractor.sessionExpiry}`
        );

        const match = await bcrypt.compare(sessionId, contractor.sessionId);

        console.log(
          `Comparison result for contractor ID: ${contractor.id} -> Match: ${match}`
        );

        return { contractor, match };
      })
    );

    const matchedUser = matches.find(({ match }) => match)?.contractor;

    if (matchedUser) {
      console.log(`User found: ${matchedUser.id}`);
      currentUser = matchedUser;
    } else {
      console.log('No matching session found.');
    }

    const { password, sessionId: storedSessionId, ...rest } = currentUser;
    res.status(200).json(rest);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
