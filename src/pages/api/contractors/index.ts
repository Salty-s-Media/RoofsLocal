import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    console.log("Request Body: ", req.body);
    const { firstName, lastName, company, email, phone, zipCodes, stripeId } =
      req.body;
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
        },
      });
      res.status(201).json(contractor);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: `Failed to create contractor: ${error}` });
    }
  } else if (req.method === "GET") {
    try {
      const contractors = await prisma.contractor.findMany();
      res.status(200).json(contractors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contractors" });
    }
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
