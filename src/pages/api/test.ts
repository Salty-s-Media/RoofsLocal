import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    return res.status(200).json({ message: "Hello World" });
  } else {
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
