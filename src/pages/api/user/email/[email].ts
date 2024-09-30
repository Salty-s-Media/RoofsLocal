import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

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
      res.status(500).json({ error: "Failed to fetch contractor" });
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
    } = req.body;

    const data = {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(company !== undefined && { company }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(zipCodes !== undefined && { zipCodes }),
      ...(stripeId !== undefined && { stripeId }),
      ...(password !== undefined && { password }),
      ...(hubspotKey !== undefined && { hubspotKey }),
    };
    console.log(decodedEmail);
    console.log(data);
    try {
      const contractor = await prisma.contractor.update({
        where: { email: decodedEmail },
        data,
      });
      res.status(200).json(contractor);
    } catch (error) {
      res.status(500).json({ error: "Failed to update contractor" });
    }
  } else if (req.method === "DELETE") {
    const { email } = req.body;
    try {
      await prisma.contractor.delete({
        where: { email: email },
      });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete contractor" });
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
