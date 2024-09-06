import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { To } = req.body;
    const to = To.startsWith("+")
      ? To.substring(2).replace(/[\(\)\-]/g, "")
      : To.replace(/[\(\)\-]/g, "");

    console.log("Call status received for number: ", to);

    const updatedContractor = await prisma.contractor.update({
      where: { phone: to },
      data: { phoneVerified: true },
    });

    return res.status(200).json({ message: "Call status received" });
  } else {
    // res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
