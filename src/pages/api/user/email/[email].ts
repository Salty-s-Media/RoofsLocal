import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email } = req.query;

  if (typeof email !== "string") {
    res.status(400).json({ error: "Email must be a string" });
    return;
  }

  const decodedEmail = decodeURIComponent(email);

  if (req.method === "GET") {
    try {
      const contractor = await prisma.contractor.findUnique({
        where: { email: decodedEmail },
      });
      if (contractor) {
        res.status(200).json({
          name: contractor.company,
          stripeId: contractor.stripeId,
          email: contractor.email,
          zipCodes: contractor.zipCodes,
        });
      } else {
        res.status(404).json({ error: "Contractor not found" });
      }
    } catch (error) {
      res.status(500).json({ error: `Failed to fetch contractor: ${error}` });
    }
  } else if (req.method === "PUT") {
    const {
      firstName,
      lastName,
      company,
      phone,
      email,
      zipCodes,
      stripeId,
      password,
      hubspotKey,
      stripeSessionId,
    } = req.body;

    const data = {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(company !== undefined && { company }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(zipCodes !== undefined && { zipCodes: zipCodes.map((zip: string) => zip.substring(0, 5)) }),
      ...(stripeId !== undefined && { stripeId }),
      ...(hubspotKey !== undefined && { hubspotKey }),
      ...(stripeSessionId !== undefined && { stripeSessionId }),
    };

    console.log(`Updating ${decodedEmail} data: ${JSON.stringify(data, null, 2)}`);

    try {
      const contractor = await prisma.contractor.findUnique({
        where: { email: decodedEmail },
      });
      if (contractor) {
        if (!stripeSessionId) {
          const isMatch = await bcrypt.compare(password, contractor.password);
          if (!isMatch) {
            res.status(401).json({ error: "Invalid password" });
            return;
          }
        }
      }
      const updatedContractor = await prisma.contractor.update({
        where: { email: decodedEmail },
        data,
      });
      res.status(200).json(updatedContractor);
    } catch (error) {
      res.status(500).json({ error: `Failed to update contractor: ${error}` });
    }
  } else if (req.method === "DELETE") {
    const { email } = req.body;
    try {
      await prisma.contractor.delete({
        where: { email: email },
      });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: `Failed to delete contractor: ${error}` });
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
