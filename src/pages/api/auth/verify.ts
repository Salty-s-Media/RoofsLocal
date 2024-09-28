import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { token, email } = req.query;

  if (typeof token !== "string" || typeof email !== "string") {
    return res.status(400).json({ error: "Invalid token or email" });
  }

  try {
    const contractor = await prisma.contractor.findUnique({
      where: { email },
    });

    if (!contractor) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    const isTokenValid = await bcrypt.compare(token, contractor.verificationToken);

    if (!isTokenValid) {
      return res.status(400).json({ error: "Invalid token" });
    }

    await prisma.contractor.update({
      where: { email },
      data: {
        isVerified: true,
        verificationToken: "",
      },
    });

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Failed to verify email:", error);
    res.status(500).json({ error: `Failed to verify email: ${error}` });
  }
}
