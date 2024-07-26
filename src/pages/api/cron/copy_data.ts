/*
  ************** IMPORTANT **************
  NEVER RUN THIS LOCALLY, FOR PROD ONLY
  ***************************************
*/

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient as PrismaClientProd } from '@prisma/client';
import { PrismaClient as PrismaClientDev } from '@prisma-dev/client';

const prismaProd = new PrismaClientProd();
const prismaDev = new PrismaClientDev();

async function copyContractors() {
  const contractors = await prismaProd.contractor.findMany();
  await prismaDev.contractor.createMany({
    data: contractors,
    skipDuplicates: true,
  });
}

const HUBSPOT_SOURCE_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_DEST_API_KEY = process.env.HUBSPOT_DEV_API_KEY;

interface Contact {
  properties: {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    zip: string;
  };
}

async function fetchContacts() {
  const response = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts?hapikey=${HUBSPOT_SOURCE_API_KEY}`
  );
  return response.json();
}

async function createContact(contactData: Contact) {
  const response = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts?hapikey=${HUBSPOT_DEST_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contactData),
    }
  );
  return response.json();
}

async function copyLeads() {
  const { results } = await fetchContacts();
    const createPromises = results.map(contact => {
      const contactData = {
        properties: {
          firstname: contact.properties.firstname,
          lastname: contact.properties.lastname,
          email: contact.properties.email,
          phone: contact.properties.phone,
          zip: contact.properties.zip,
        },
      };
      return createContact(contactData);
    });
    await Promise.all(createPromises);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.VERCEL_ENV !== 'production') {
    return res.status(403).json({ error: 'Forbidden: Only runs in production' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await copyContractors();
    await copyLeads();

    res.status(200).json({ message: 'Data copied successfully' });
  } catch (error) {
    console.error('Error copying data:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prismaProd.$disconnect();
    await prismaDev.$disconnect();
  }
}
